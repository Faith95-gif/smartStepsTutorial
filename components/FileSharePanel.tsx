import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import {
  X,
  Crown,
  EyeOff,
  Download,
  Trash,
  Clock,
  File,
  Upload,
  Folder
} from "lucide-react";

// ============= SharedFile Interface =============
export interface SharedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploaderId: string;
  uploadedAt: Date;
  url?: string;
  path?: string;
  groupId?: string | null;
  groupName?: string | null;
}

// ============= FileSharePanel Component =============
interface FileSharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  files: SharedFile[];
  setFiles: React.Dispatch<React.SetStateAction<SharedFile[]>>;
  userName: string;
  isHost: boolean;
  myUserId: string;
  hiddenFileIds: Set<string>;
  setHiddenFileIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  meetingId: string;
  serverUrl: string;
}

const FileSharePanel = ({ 
  isOpen, 
  onClose, 
  files, 
  setFiles, 
  userName, 
  isHost, 
  myUserId, 
  hiddenFileIds, 
  setHiddenFileIds,
  meetingId,
  serverUrl
}: FileSharePanelProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'images' | 'documents' | 'media'>('all');
  const [fileSocket, setFileSocket] = useState<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Initialize file sharing socket
  useEffect(() => {
    if (!isOpen || !meetingId) return;

    const socket = io(`${serverUrl}/file-updates`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    setFileSocket(socket);

    socket.on('connect', () => {
      console.log('File socket connected:', socket.id);
      socket.emit('join-room', meetingId);
      loadExistingFiles();
    });

    socket.on('update', (data: { type: string; data: any }) => {
      console.log('File update received:', data);
      if (data.type === 'files-updated') {
        if (Array.isArray(data.data)) {
          // New files added
          const newFiles = data.data.map((file: any) => ({
            id: file.id,
            name: file.name,
            size: file.size,
            mimeType: file.mimeType,
            uploadedBy: userName, // We'll get this from the server response
            uploaderId: file.uploaderId || myUserId,
            uploadedAt: new Date(file.uploadedAt),
            groupId: file.groupId,
            groupName: file.groupName,
          }));
          setFiles(prev => [...newFiles, ...prev.filter(f => !newFiles.some(nf => nf.id === f.id))]);
        } else if (data.data.deletedFileId) {
          // File deleted
          setFiles(prev => prev.filter(f => f.id !== data.data.deletedFileId));
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('File socket disconnected');
    });

    return () => {
      socket.emit('leave-room', meetingId);
      socket.disconnect();
    };
  }, [isOpen, meetingId, serverUrl, userName, myUserId, setFiles]);

  // Load existing files from server
  const loadExistingFiles = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/files?meetingId=${meetingId}`);
      if (response.ok) {
        const serverFiles = await response.json();
        const formattedFiles = serverFiles.map((file: any) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          uploadedBy: userName, // Server should provide this
          uploaderId: file.uploaderId || myUserId,
          uploadedAt: new Date(file.uploadedAt),
          groupId: file.groupId,
          groupName: file.groupName,
        }));
        setFiles(formattedFiles);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📑';
    if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return '🗜️';
    return '📁';
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Create FormData for upload
        const formData = new FormData();
        formData.append('files', file);
        formData.append('meetingId', meetingId);
        
        // Update progress
        setUploadProgress((i / selectedFiles.length) * 90);

        // Upload to server
        const response = await fetch(`${serverUrl}/api/files`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const uploadedFiles = await response.json();
        console.log('Files uploaded successfully:', uploadedFiles);
        
        // Files will be added via socket update, no need to manually add here
      }
      
      setUploadProgress(100);
      toast({
        title: "Upload Complete",
        description: `${selectedFiles.length} file(s) uploaded successfully`,
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const deleteFileForEveryone = async (id: string) => {
    try {
      const response = await fetch(`${serverUrl}/api/files/${id}?meetingId=${meetingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      toast({
        description: "File deleted successfully",
      });
      
      // File will be removed via socket update
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const hideFileForMe = (id: string) => {
    setHiddenFileIds(prev => new Set([...prev, id]));
    toast({
      description: "File hidden for you",
    });
  };

  const canDeleteForEveryone = (file: SharedFile) => {
    return isHost || file.uploaderId === myUserId;
  };

  const downloadFile = async (file: SharedFile) => {
    try {
      const response = await fetch(`${serverUrl}/api/files/${file.id}/download?meetingId=${meetingId}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        description: "File downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const getFilteredFiles = () => {
    let filtered = files.filter(file => 
      !hiddenFileIds.has(file.id) &&
      (file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       file.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    switch (activeFilter) {
      case 'images':
        return filtered.filter(f => f.mimeType.startsWith('image/'));
      case 'documents':
        return filtered.filter(f => 
          f.mimeType.includes('pdf') || f.mimeType.includes('word') || 
          f.mimeType.includes('document') || f.mimeType.includes('sheet') || 
          f.mimeType.includes('excel') || f.mimeType.includes('presentation')
        );
      case 'media':
        return filtered.filter(f => f.mimeType.startsWith('video/') || f.mimeType.startsWith('audio/'));
      default:
        return filtered;
    }
  };

  const filteredFiles = getFilteredFiles();

  const getFileCounts = () => {
    const visible = files.filter(f => !hiddenFileIds.has(f.id));
    return {
      all: visible.length,
      images: visible.filter(f => f.mimeType.startsWith('image/')).length,
      documents: visible.filter(f => 
        f.mimeType.includes('pdf') || f.mimeType.includes('word') || 
        f.mimeType.includes('document') || f.mimeType.includes('sheet') || 
        f.mimeType.includes('excel') || f.mimeType.includes('presentation')
      ).length,
      media: visible.filter(f => f.mimeType.startsWith('video/') || f.mimeType.startsWith('audio/')).length,
    };
  };

  const fileCounts = getFileCounts();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 w-full h-full z-[9999] flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0c0f1a 0%, #131829 50%, #0a0d14 100%)',
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fileFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(1deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6); }
        }
        .file-card {
          animation: fadeIn 0.4s ease-out backwards;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .file-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 20px 40px -10px rgba(139, 92, 246, 0.3);
        }
        .shimmer-bg {
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }
        .glow-border {
          position: relative;
        }
        .glow-border::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(45deg, #8b5cf6, #06b6d4, #8b5cf6);
          border-radius: inherit;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .glow-border:hover::before {
          opacity: 1;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-20 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute bottom-40 -left-32 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5" style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%238b5cf6\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
      </div>
      
      {/* Header */}
      <div 
        className="relative flex items-center justify-between px-6 py-5 border-b backdrop-blur-xl"
        style={{ 
          borderColor: 'rgba(139, 92, 246, 0.2)',
          background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.1) 50%, transparent 100%)'
        }}
      >
        <div className="flex items-center gap-5">
          <div 
            className="relative h-14 w-14 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              animation: 'pulse-glow 3s ease-in-out infinite'
            }}
          >
            <div className="absolute inset-0 shimmer-bg" />
            <Folder className="h-7 w-7 text-white relative z-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Meeting Files
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-400">{fileCounts.all} file{fileCounts.all !== 1 ? 's' : ''}</span>
              {isHost && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  <Crown className="h-3 w-3" /> Host
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-12 w-12 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-4 flex gap-2 flex-wrap">
        {(['all', 'images', 'documents', 'media'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeFilter === filter
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)} 
            <span className="ml-1 text-xs opacity-70">({fileCounts[filter]})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-6 pb-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files by name or uploader..."
            className="w-full pl-12 pr-4 h-12 rounded-xl border text-white placeholder:text-slate-500 focus:outline-none transition-all"
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              borderColor: 'rgba(139, 92, 246, 0.2)'
            }}
          />
        </div>
      </div>

      {/* Upload Area */}
      <div className="px-6 pb-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all overflow-hidden",
            dragOver 
              ? "border-violet-400 bg-violet-500/10" 
              : "border-slate-600/50 hover:border-violet-500/50 hover:bg-slate-800/30"
          )}
        >
          <div className="absolute inset-0 shimmer-bg opacity-50" />
          {isUploading ? (
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-56 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-sm text-slate-300 font-medium">Uploading... {uploadProgress}%</span>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div 
                className="h-16 w-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}
              >
                <Upload className="h-8 w-8 text-violet-400" />
              </div>
              <div className="text-center">
                <span className="text-sm text-slate-300 font-medium">Drop files here or click to upload</span>
                <p className="text-xs text-slate-500 mt-1">Share files with all meeting participants</p>
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Files Grid */}
      <ScrollArea className="flex-1 px-6">
        <div className="pb-6">
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div 
                className="h-24 w-24 rounded-3xl flex items-center justify-center mb-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}
              >
                <Folder className="h-12 w-12 text-slate-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                {searchTerm ? 'No files found' : 'No files shared yet'}
              </h3>
              <p className="text-sm text-slate-500 max-w-xs">
                {searchTerm ? 'Try adjusting your search or filter' : 'Upload files to share them with all meeting participants'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFiles.map((file, idx) => (
                <div
                  key={file.id}
                  className="file-card relative p-4 rounded-2xl border backdrop-blur-sm group"
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
                    borderColor: 'rgba(139, 92, 246, 0.15)',
                    animationDelay: `${idx * 60}ms`
                  }}
                >
                  {/* Highlight for own files */}
                  {file.uploaderId === myUserId && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Your file
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <div 
                      className="h-14 w-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.2)'
                      }}
                    >
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-semibold text-white truncate text-lg">{file.name}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-400 mt-1.5">
                        <span className="flex items-center gap-1">
                          <File className="h-3.5 w-3.5" />
                          {formatFileSize(file.size)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span className="truncate">by {file.uploadedBy}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {file.uploadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700/50">
                    <button
                      onClick={() => downloadFile(file)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all bg-gradient-to-r from-violet-500/10 to-cyan-500/10 text-violet-300 border border-violet-500/30 hover:from-violet-500/20 hover:to-cyan-500/20"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                    
                    {canDeleteForEveryone(file) ? (
                      <button
                        onClick={() => deleteFileForEveryone(file.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                        title="Delete for everyone"
                      >
                        <Trash className="h-4 w-4" />
                        Delete
                      </button>
                    ) : (
                      <button
                        onClick={() => hideFileForMe(file.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all bg-slate-500/10 text-slate-400 border border-slate-500/30 hover:bg-slate-500/20"
                        title="Hide for me only"
                      >
                        <EyeOff className="h-4 w-4" />
                        Hide
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FileSharePanel;