import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "./integrations/supabase/client";
import { GraduationCap, Home, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Attempt {
  id: string;
  student_name: string;
  selected_subject: string;
  score: number | null;
  total_questions: number | null;
  is_completed: boolean;
  submitted_at: string | null;
}

const ExamResult = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      const { data, error } = await supabase
        .from("student_attempts")
        .select("*")
        .eq("id", attemptId)
        .single();

      if (error) throw error;
      setAttempt(data);
    } catch (error) {
      console.error("Error fetching result:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScorePercentage = () => {
    if (!attempt?.score || !attempt?.total_questions) return 0;
    return Math.round((attempt.score / attempt.total_questions) * 100);
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 70) return { grade: "A", color: "text-success", message: "Excellent!" };
    if (percentage >= 60) return { grade: "B", color: "text-primary", message: "Very Good!" };
    if (percentage >= 50) return { grade: "C", color: "text-warning", message: "Good" };
    if (percentage >= 40) return { grade: "D", color: "text-orange-500", message: "Fair" };
    return { grade: "F", color: "text-destructive", message: "Needs Improvement" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!attempt || !attempt.is_completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Result Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This result doesn't exist or the exam hasn't been completed.
            </p>
            <Link to="/">
              <Button variant="outline">Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const percentage = getScorePercentage();
  const gradeInfo = getGrade(percentage);

  return (
    <div className="min-h-screen bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-success/10 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-2xl relative">
        <Card className="shadow-xl border-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-primary p-8 text-center text-primary-foreground">
            <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">Exam Completed!</h1>
            <p className="opacity-90">Great job, {attempt.student_name}!</p>
          </div>

          <CardContent className="p-8">
            {/* Score Card */}
            <Card className="bg-muted/50 border-0 mb-6">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Your Score</p>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <span className={`text-7xl font-display font-bold ${gradeInfo.color}`}>
                    {attempt.score}
                  </span>
                  <span className="text-3xl text-muted-foreground">/ {attempt.total_questions}</span>
                </div>
                <Progress value={percentage} className="h-3 mb-4" />
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className={`text-lg px-4 py-1 ${gradeInfo.color}`}>
                    Grade: {gradeInfo.grade}
                  </Badge>
                  <Badge variant="secondary" className="text-lg px-4 py-1">
                    {percentage}%
                  </Badge>
                </div>
                <p className={`mt-4 font-medium ${gradeInfo.color}`}>{gradeInfo.message}</p>
              </CardContent>
            </Card>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="bg-success/5 border-success/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">Correct</p>
                    <p className="text-2xl font-bold text-success">{attempt.score}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-destructive" />
                  <div>
                    <p className="text-sm text-muted-foreground">Incorrect</p>
                    <p className="text-2xl font-bold text-destructive">
                      {(attempt.total_questions || 0) - (attempt.score || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center text-sm text-muted-foreground mb-6">
              <p>Fourth Subject: <Badge variant="outline">{attempt.selected_subject}</Badge></p>
              {attempt.submitted_at && (
                <p className="mt-2">
                  Submitted: {new Date(attempt.submitted_at).toLocaleString()}
                </p>
              )}
            </div>

            <Link to="/">
              <Button className="w-full bg-gradient-primary hover:opacity-90 gap-2">
                <Home className="w-4 h-4" />
                Return to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExamResult;
