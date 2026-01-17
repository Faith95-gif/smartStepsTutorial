import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Download,
  X,
  Check,
  Clock,
  Palette,
  MoreHorizontal,
  Search,
  FolderOpen,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteColors = [
  { name: "yellow", class: "bg-note-yellow" },
  { name: "pink", class: "bg-note-pink" },
  { name: "blue", class: "bg-note-blue" },
  { name: "green", class: "bg-note-green" },
  { name: "purple", class: "bg-note-purple" },
  { name: "orange", class: "bg-note-orange" },
];

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotesPanel = ({ isOpen, onClose }: NotesPanelProps) => {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      title: "Meeting Notes",
      content: "Key discussion points from today's meeting...",
      color: "yellow",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selectedNote && isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedNote, isEditing]);

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: "",
      color: "yellow",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    setEditTitle(newNote.title);
    setEditContent(newNote.content);
    setIsEditing(true);
  };

  const saveNote = () => {
    if (!selectedNote) return;
    
    const updatedNotes = notes.map((note) =>
      note.id === selectedNote.id
        ? { ...note, title: editTitle || "Untitled Note", content: editContent, updatedAt: new Date() }
        : note
    );
    setNotes(updatedNotes);
    setSelectedNote({ ...selectedNote, title: editTitle || "Untitled Note", content: editContent, updatedAt: new Date() });
    setIsEditing(false);
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setIsEditing(false);
    }
    setShowDeleteConfirm(null);
  };

  const downloadNote = (note: Note) => {
    const content = `${note.title}\n\n${note.content}\n\nCreated: ${note.createdAt.toLocaleString()}\nLast updated: ${note.updatedAt.toLocaleString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const changeNoteColor = (noteId: string, color: string) => {
    const updatedNotes = notes.map((note) =>
      note.id === noteId ? { ...note, color, updatedAt: new Date() } : note
    );
    setNotes(updatedNotes);
    if (selectedNote?.id === noteId) {
      setSelectedNote({ ...selectedNote, color });
    }
    setShowColorPicker(false);
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getColorClass = (color: string) => {
    return noteColors.find((c) => c.name === color)?.class || "bg-note-yellow";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] z-50 animate-slide-in-right">
      <div className="h-full flex flex-col glass-panel rounded-l-3xl shadow-elevation">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Meeting Notes</h2>
              <p className="text-xs text-muted-foreground">{notes.length} notes</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search & Create */}
        <div className="p-4 space-y-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <Button
            onClick={createNewNote}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Note
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Notes List */}
          <ScrollArea className={cn("border-r border-border/50", selectedNote ? "w-1/2" : "w-full")}>
            <div className="p-3 space-y-2">
              {filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                  <p className="text-xs text-muted-foreground/70">Create your first note above</p>
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setEditTitle(note.title);
                      setEditContent(note.content);
                      setIsEditing(false);
                    }}
                    className={cn(
                      "group relative p-3 rounded-xl cursor-pointer transition-all duration-200",
                      getColorClass(note.color),
                      selectedNote?.id === note.id
                        ? "ring-2 ring-primary shadow-md scale-[1.02]"
                        : "hover:shadow-md hover:scale-[1.01]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate text-sm">
                          {note.title}
                        </h3>
                        <p className="text-xs text-foreground/60 line-clamp-2 mt-1">
                          {note.content || "No content"}
                        </p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadNote(note);
                          }}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg bg-background/50 hover:bg-background"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(note.id);
                          }}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg bg-background/50 hover:bg-destructive/20 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-foreground/40" />
                      <span className="text-[10px] text-foreground/40">
                        {note.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Delete confirmation */}
                    {showDeleteConfirm === note.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 bg-destructive/90 rounded-xl flex items-center justify-center gap-3 animate-fade-in"
                      >
                        <span className="text-sm text-destructive-foreground font-medium">Delete?</span>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                          size="sm"
                          className="h-8 bg-background text-destructive hover:bg-background/90"
                        >
                          Yes
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(null);
                          }}
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive-foreground hover:bg-destructive/80"
                        >
                          No
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Note Editor */}
          {selectedNote && (
            <div className="w-1/2 flex flex-col bg-background/50">
              <div className="p-3 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8 rounded-lg", getColorClass(selectedNote.color))}
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-secondary"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={saveNote}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg bg-success/20 text-success hover:bg-success/30"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => downloadNote(selectedNote)}
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>

              {/* Color Picker */}
              {showColorPicker && (
                <div className="p-3 border-b border-border/50 animate-fade-in">
                  <div className="flex items-center gap-2">
                    {noteColors.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => changeNoteColor(selectedNote.id, color.name)}
                        className={cn(
                          "h-8 w-8 rounded-full transition-all",
                          color.class,
                          selectedNote.color === color.name
                            ? "ring-2 ring-primary ring-offset-2"
                            : "hover:scale-110"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {isEditing ? (
                    <>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Note title..."
                        className="font-semibold text-lg border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                      />
                      <textarea
                        ref={textareaRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Start typing your note..."
                        className="w-full min-h-[200px] bg-transparent border-0 resize-none text-sm text-foreground/80 focus:outline-none"
                      />
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-lg text-foreground">
                        {selectedNote.title}
                      </h3>
                      <p className="text-sm text-foreground/70 whitespace-pre-wrap">
                        {selectedNote.content || "Click edit to add content..."}
                      </p>
                    </>
                  )}
                </div>
              </ScrollArea>

              <div className="p-3 border-t border-border/50 text-[10px] text-muted-foreground">
                Last edited: {selectedNote.updatedAt.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Notes Popup Button Component
interface NotesPopupButtonProps {
  onOpenNotes: () => void;
}

export const NotesPopupButton = ({ onOpenNotes }: NotesPopupButtonProps) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <div className="fixed top-6 right-6 z-50">
      <Button
        onClick={() => setIsPopupOpen(!isPopupOpen)}
        variant="ghost"
        size="icon"
        className={cn(
          "h-12 w-12 rounded-2xl bg-control-bg/90 backdrop-blur-xl hover:bg-control-hover shadow-elevation border border-border/50 transition-all duration-300",
          isPopupOpen && "bg-primary hover:bg-primary/90 text-primary-foreground scale-110"
        )}
      >
        <MoreHorizontal className="h-6 w-6" />
      </Button>

      {isPopupOpen && (
        <div className="absolute top-16 right-0 animate-scale-in">
          <div className="glass-panel rounded-2xl p-3 shadow-elevation min-w-[180px]">
            <Button
              onClick={() => {
                onOpenNotes();
                setIsPopupOpen(false);
              }}
              variant="ghost"
              className="w-full justify-start gap-3 h-12 rounded-xl hover:bg-secondary/80 transition-colors"
            >
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Notes</p>
                <p className="text-[10px] text-muted-foreground">Meeting notes</p>
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
