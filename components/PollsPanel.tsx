import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  X,
  Plus,
  Settings,
  BarChart3,
  Clock,
  Check,
  Users2,
  EyeOff
} from "lucide-react";

// ============= Poll Interfaces =============
export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  meetingId: string;
  creatorId: string;
  creatorName: string;
  question: string;
  options: PollOption[];
  voters: Record<string, { selectedOptions: number[]; timestamp: number }>;
  active: boolean;
  isAnonymous: boolean;
  isMultiSelect: boolean;
  maxSelections: number;
  createdAt: number;
  endTime: number | null;
}

// ============= CreatePollModal Component =============
interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (pollData: {
    question: string;
    options: string[];
    isAnonymous: boolean;
    isMultiSelect: boolean;
    maxSelections: number;
    duration: number | null;
  }) => void;
}

export const CreatePollModal = ({ isOpen, onClose, onCreatePoll }: CreatePollModalProps) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [maxSelections, setMaxSelections] = useState(1);
  const [hasDuration, setHasDuration] = useState(false);
  const [duration, setDuration] = useState(60);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    const validOptions = options.filter(o => o.trim());
    if (question.trim() && validOptions.length >= 2) {
      onCreatePoll({
        question: question.trim(),
        options: validOptions,
        isAnonymous,
        isMultiSelect,
        maxSelections: isMultiSelect ? maxSelections : 1,
        duration: hasDuration ? duration : null,
      });
      
      // Reset form
      setQuestion('');
      setOptions(['', '']);
      setIsAnonymous(false);
      setIsMultiSelect(false);
      setMaxSelections(1);
      setHasDuration(false);
      setDuration(60);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div 
        className="w-full max-w-lg mx-4 rounded-2xl border overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderColor: 'rgba(148, 163, 184, 0.2)'
        }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
            >
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Create Poll</h2>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Question</label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask your question..."
              className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Options</label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                  />
                  {options.length > 2 && (
                    <Button
                      onClick={() => handleRemoveOption(index)}
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <Button
                onClick={handleAddOption}
                variant="ghost"
                className="mt-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Poll Settings
            </h3>

            {/* Anonymous Voting */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Anonymous Voting</Label>
                <p className="text-xs text-slate-400">Hide who voted for what</p>
              </div>
              <Switch
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>

            {/* Multiple Choice */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Allow Multiple Selections</Label>
                <p className="text-xs text-slate-400">Participants can select multiple options</p>
              </div>
              <Switch
                checked={isMultiSelect}
                onCheckedChange={setIsMultiSelect}
              />
            </div>

            {isMultiSelect && (
              <div className="flex items-center justify-between pl-4 border-l-2 border-emerald-500/30">
                <Label className="text-slate-300">Max selections allowed</Label>
                <Input
                  type="number"
                  min={2}
                  max={options.filter(o => o.trim()).length || 2}
                  value={maxSelections}
                  onChange={(e) => setMaxSelections(parseInt(e.target.value) || 2)}
                  className="w-20 bg-slate-800/50 border-slate-600/50 text-white text-center"
                />
              </div>
            )}

            {/* Duration */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Set Duration</Label>
                <p className="text-xs text-slate-400">Auto-end poll after time limit</p>
              </div>
              <Switch
                checked={hasDuration}
                onCheckedChange={setHasDuration}
              />
            </div>

            {hasDuration && (
              <div className="flex items-center justify-between pl-4 border-l-2 border-emerald-500/30">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration (seconds)
                </Label>
                <Input
                  type="number"
                  min={10}
                  max={3600}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  className="w-24 bg-slate-800/50 border-slate-600/50 text-white text-center"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 justify-end" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-700/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
          >
            Create Poll
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============= PollPanel Component =============
interface PollPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  activePolls: Poll[];
  endedPolls: Poll[];
  myUserId: string;
  onCreatePoll: () => void;
  onVote: (pollId: string, selectedOptions: number[]) => void;
  onEndPoll: (pollId: string) => void;
}

const PollPanel = ({ 
  isOpen, 
  onClose, 
  isHost, 
  activePolls, 
  endedPolls, 
  myUserId,
  onCreatePoll,
  onVote,
  onEndPoll
}: PollPanelProps) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number[]>>({});
  const [viewMode, setViewMode] = useState<'active' | 'ended'>('active');

  const handleOptionSelect = (pollId: string, optionId: number, isMultiSelect: boolean, maxSelections: number) => {
    setSelectedOptions(prev => {
      const current = prev[pollId] || [];
      
      if (isMultiSelect) {
        if (current.includes(optionId)) {
          return { ...prev, [pollId]: current.filter(id => id !== optionId) };
        } else if (current.length < maxSelections) {
          return { ...prev, [pollId]: [...current, optionId] };
        }
        return prev;
      } else {
        return { ...prev, [pollId]: [optionId] };
      }
    });
  };

  const handleSubmitVote = (pollId: string) => {
    const selected = selectedOptions[pollId];
    if (selected && selected.length > 0) {
      onVote(pollId, selected);
    }
  };

  const hasVoted = (poll: Poll) => {
    return poll.voters && poll.voters[myUserId];
  };

  const getMyVotes = (poll: Poll): number[] => {
    return poll.voters?.[myUserId]?.selectedOptions || [];
  };

  const getTotalVotes = (poll: Poll) => {
    return poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  };

  const getVotePercentage = (option: PollOption, totalVotes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((option.votes / totalVotes) * 100);
  };

  const formatTimeLeft = (endTime: number | null) => {
    if (!endTime) return null;
    const remaining = Math.max(0, endTime - Date.now());
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 w-full h-full z-[9999] flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      
      {/* Header */}
      <div 
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ 
          borderColor: 'rgba(148, 163, 184, 0.2)',
          background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%)'
        }}
      >
        <div className="flex items-center gap-4">
          <div 
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)'
            }}
          >
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Polls</h2>
            <p className="text-sm text-slate-400">{activePolls.length} active, {endedPolls.length} ended</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-11 w-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-5 py-3 flex gap-2">
        <button
          onClick={() => setViewMode('active')}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-all",
            viewMode === 'active' 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          )}
        >
          Active ({activePolls.length})
        </button>
        <button
          onClick={() => setViewMode('ended')}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-all",
            viewMode === 'ended' 
              ? "bg-slate-500/20 text-slate-300 border border-slate-500/30" 
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          )}
        >
          Ended ({endedPolls.length})
        </button>
      </div>

      {/* Create Poll Button - Only for host */}
      {isHost && viewMode === 'active' && (
        <div className="px-5 pb-4">
          <button
            onClick={onCreatePoll}
            className="w-full h-14 rounded-xl font-semibold text-white flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Plus className="h-6 w-6" />
            Create New Poll
          </button>
        </div>
      )}

      {/* Polls List */}
      <ScrollArea className="flex-1 px-5">
        <div className="space-y-4 pb-6">
          {(viewMode === 'active' ? activePolls : endedPolls).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-20 w-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                <BarChart3 className="h-10 w-10 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-300 mb-1">
                No {viewMode === 'active' ? 'active' : 'ended'} polls
              </h3>
              <p className="text-sm text-slate-500">
                {viewMode === 'active' && isHost 
                  ? 'Create a poll to get started' 
                  : viewMode === 'active' 
                    ? 'Wait for the host to create a poll'
                    : 'Ended polls will appear here'}
              </p>
            </div>
          ) : (
            (viewMode === 'active' ? activePolls : endedPolls).map((poll) => {
              const totalVotes = getTotalVotes(poll);
              const voted = hasVoted(poll);
              const myVotes = getMyVotes(poll);
              const timeLeft = formatTimeLeft(poll.endTime);

              return (
                <div
                  key={poll.id}
                  className="p-5 rounded-2xl border"
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderColor: poll.active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'
                  }}
                >
                  {/* Poll Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{poll.question}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users2 className="h-3 w-3" />
                          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                        </span>
                        {poll.isAnonymous && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <EyeOff className="h-3 w-3" />
                            Anonymous
                          </span>
                        )}
                        {poll.isMultiSelect && (
                          <span className="text-blue-400">
                            Multi-select (max {poll.maxSelections})
                          </span>
                        )}
                        {timeLeft && poll.active && (
                          <span className="flex items-center gap-1 text-orange-400">
                            <Clock className="h-3 w-3" />
                            {timeLeft}
                          </span>
                        )}
                      </div>
                    </div>
                    {isHost && poll.active && (
                      <Button
                        onClick={() => onEndPoll(poll.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        End Poll
                      </Button>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {poll.options.map((option) => {
                      const percentage = getVotePercentage(option, totalVotes);
                      const isSelected = (selectedOptions[poll.id] || []).includes(option.id);
                      const wasMyVote = myVotes.includes(option.id);

                      return (
                        <div key={option.id}>
                          {poll.active && !voted ? (
                            <button
                              onClick={() => handleOptionSelect(poll.id, option.id, poll.isMultiSelect, poll.maxSelections)}
                              className={cn(
                                "w-full p-3 rounded-xl text-left transition-all flex items-center gap-3",
                                isSelected 
                                  ? "bg-emerald-500/20 border-2 border-emerald-500/50" 
                                  : "bg-slate-800/50 border-2 border-transparent hover:border-slate-600/50"
                              )}
                            >
                              <div className={cn(
                                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                                poll.isMultiSelect ? "rounded-md" : "",
                                isSelected 
                                  ? "border-emerald-500 bg-emerald-500" 
                                  : "border-slate-500"
                              )}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span className="text-white flex-1">{option.text}</span>
                            </button>
                          ) : (
                            <div className="p-3 rounded-xl bg-slate-800/50 relative overflow-hidden">
                              <div 
                                className="absolute inset-0 bg-emerald-500/20 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                              <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-white",
                                    wasMyVote && "font-semibold"
                                  )}>
                                    {option.text}
                                  </span>
                                  {wasMyVote && (
                                    <span className="text-xs text-emerald-400">(Your vote)</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-300">{option.votes}</span>
                                  <span className="text-sm font-semibold text-emerald-400">{percentage}%</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Vote Button */}
                  {poll.active && !voted && (
                    <Button
                      onClick={() => handleSubmitVote(poll.id)}
                      disabled={!selectedOptions[poll.id]?.length}
                      className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white disabled:opacity-50"
                    >
                      Submit Vote
                    </Button>
                  )}

                  {voted && poll.active && (
                    <p className="text-center text-sm text-emerald-400 mt-4">
                      ✓ You have voted
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PollPanel;
