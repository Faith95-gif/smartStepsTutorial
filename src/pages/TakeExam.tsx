import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "./integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Send, Maximize } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
}

interface Question {
  id: string;
  subject: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  question_order: number;
}

interface Attempt {
  id: string;
  selected_subject: string;
  answers: Record<string, string> | null;
  chances_remaining: number;
  is_completed: boolean;
  session_id: string;
}

type ExamSubject = "English" | "Physics" | "Chemistry" | "Maths" | "Biology";

const SUBJECTS_ORDER = ["English", "Physics", "Chemistry"];

const TakeExam = () => {
  const { examId, attemptId } = useParams<{ examId: string; attemptId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showExamEnded, setShowExamEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initializeExam();
    }
  }, [examId, attemptId]);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0 || !attempt || attempt.is_completed) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, attempt]);

  // Visibility and fullscreen detection
  useEffect(() => {
    if (!attempt || attempt.is_completed) return;

    const handleVisibilityChange = () => {
      if (document.hidden && attempt.chances_remaining > 0) {
        deductChance("You left the exam page!");
      }
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && attempt.chances_remaining > 0 && hasInitialized.current) {
        deductChance("You exited fullscreen mode!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [attempt]);

  const enterFullscreen = async () => {
    try {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  const initializeExam = async () => {
    try {
      // Fetch exam
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

      if (examError) throw examError;
      setExam(examData);

      // Fetch attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from("student_attempts")
        .select("*")
        .eq("id", attemptId)
        .single();

      if (attemptError) throw attemptError;

      // Verify session
      const storedSession = localStorage.getItem(`exam_session_${attemptId}`);
      if (storedSession !== attemptData.session_id) {
        toast({
          title: "Invalid session",
          description: "You cannot access this exam.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const parsedAnswers = (attemptData.answers as Record<string, string>) || {};

      if (attemptData.is_completed) {
        setShowExamEnded(true);
        setAttempt({ ...attemptData, answers: parsedAnswers });
        return;
      }

      setAttempt({ ...attemptData, answers: parsedAnswers });
      setAnswers(parsedAnswers);

      // Calculate remaining time
      const startTime = new Date(attemptData.started_at).getTime();
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const totalSeconds = examData.duration_minutes * 60;
      const remaining = Math.max(0, totalSeconds - elapsedSeconds);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        handleSubmit(true);
        return;
      }

      // Fetch questions for the student's subjects
      const subjects: ExamSubject[] = ["English", "Physics", "Chemistry", attemptData.selected_subject as ExamSubject];
      const { data: questionsData, error: questionsError } = await supabase
        .from("exam_questions_safe")
        .select("*")
        .eq("exam_id", examId)
        .in("subject", subjects)
        .order("subject")
        .order("question_order");

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Enter fullscreen
      await enterFullscreen();
    } catch (error: any) {
      toast({
        title: "Error loading exam",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const deductChance = async (reason: string) => {
    if (!attempt || attempt.chances_remaining <= 0) return;

    const newChances = attempt.chances_remaining - 1;

    try {
      const { error } = await supabase
        .from("student_attempts")
        .update({ chances_remaining: newChances })
        .eq("id", attemptId);

      if (error) throw error;

      setAttempt((prev) => prev ? { ...prev, chances_remaining: newChances } : null);

      if (newChances <= 0) {
        setWarningMessage("All chances used! Your exam is ending...");
        setShowWarning(true);
        setTimeout(() => {
          handleSubmit(true);
        }, 2000);
      } else {
        setWarningMessage(`${reason} You have ${newChances} chance${newChances !== 1 ? "s" : ""} left.`);
        setShowWarning(true);
      }
    } catch (error) {
      console.error("Error deducting chance:", error);
    }
  };

  const handleAnswerChange = async (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    // Save to database
    try {
      await supabase
        .from("student_attempts")
        .update({ answers: newAnswers })
        .eq("id", attemptId);
    } catch (error) {
      console.error("Error saving answer:", error);
    }
  };

const handleSubmit = async (autoSubmit = false) => {
  if (submitting) return;
  
  if (!autoSubmit && !confirm("Are you sure you want to submit? You cannot change your answers after submission.")) {
    return;
  }

  setSubmitting(true);

  try {
    // Call the database function to grade the exam
    const { data, error } = await supabase.rpc('grade_exam', {
      _attempt_id: attemptId,
      _session_id: localStorage.getItem(`exam_session_${attemptId}`)
    });

    if (error) throw error;

    // Exit fullscreen
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }

    toast({
      title: "Exam submitted!",
      description: `Your exam has been graded successfully. Score: ${data.score}/${data.total}`,
    });

    navigate(`/exam/result/${attemptId}`);
  } catch (error: any) {
    toast({
      title: "Error submitting exam",
      description: error.message,
      variant: "destructive",
    });
    setSubmitting(false);
  }
};
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showExamEnded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-success" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Exam Already Submitted</h2>
            <p className="text-muted-foreground mb-4">
              Your exam has already been submitted and graded.
            </p>
            <Button onClick={() => navigate(`/exam/result/${attemptId}`)}>
              View Results
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isFullscreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" ref={containerRef}>
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Maximize className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Fullscreen Required</h2>
            <p className="text-muted-foreground mb-4">
              Please enter fullscreen mode to continue your exam.
            </p>
            <Button onClick={enterFullscreen} className="bg-gradient-primary">
              Enter Fullscreen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold">{exam?.title}</h1>
            <div className="flex items-center gap-4 mt-1">
              <Badge variant={attempt && attempt.chances_remaining <= 1 ? "destructive" : "secondary"}>
                {attempt?.chances_remaining} chance{attempt?.chances_remaining !== 1 ? "s" : ""} left
              </Badge>
              <span className="text-sm text-muted-foreground">
                {answeredCount}/{questions.length} answered
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining < 300 ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
              <Clock className="w-5 h-5" />
              <span className="font-mono text-lg font-bold">{formatTime(timeRemaining)}</span>
            </div>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="bg-gradient-success gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit
            </Button>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="px-4 py-2 bg-card border-b border-border">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {currentQuestion && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Badge>{currentQuestion.subject}</Badge>
                <span className="text-sm text-muted-foreground">
                  Question {currentIndex + 1} of {questions.length}
                </span>
              </div>
              <CardTitle className="text-lg leading-relaxed">
                {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                className="space-y-3"
              >
                {[
                  { key: "A", value: currentQuestion.option_a },
                  { key: "B", value: currentQuestion.option_b },
                  { key: "C", value: currentQuestion.option_c },
                  { key: "D", value: currentQuestion.option_d },
                ].map((option) => (
                  <div key={option.key}>
                    <RadioGroupItem
                      value={option.key}
                      id={`option-${option.key}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`option-${option.key}`}
                      className="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted"
                    >
                      <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {option.key}
                      </span>
                      <span className="pt-1">{option.value}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          {/* Question Grid */}
          <div className="flex flex-wrap gap-2 max-w-lg justify-center">
            {questions.slice(0, 20).map((q, i) => (
              <Button
                key={q.id}
                variant={currentIndex === i ? "default" : answers[q.id] ? "secondary" : "outline"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setCurrentIndex(i)}
              >
                {i + 1}
              </Button>
            ))}
            {questions.length > 20 && (
              <span className="text-sm text-muted-foreground self-center">
                +{questions.length - 20} more
              </span>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentIndex === questions.length - 1}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </main>

      {/* Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Warning
            </AlertDialogTitle>
            <AlertDialogDescription>{warningMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarning(false)}>
              Continue Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TakeExam;
