import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, RefreshCw, Users, CheckCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Exam {
  id: string;
  title: string;
}

interface StudentAttempt {
  id: string;
  exam_id: string;
  student_name: string;
  student_phone: string;
  selected_subject: string;
  score: number | null;
  total_questions: number | null;
  is_completed: boolean;
  started_at: string;
  submitted_at: string | null;
}

const LiveResults = ({ exams }: { exams: Exam[] }) => {
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchAttempts();

    // Set up realtime subscription
    const channel = supabase
      .channel("student_attempts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_attempts",
        },
        (payload) => {
          console.log("Realtime update:", payload);
          fetchAttempts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from("student_attempts")
        .select("*")
        .order("started_at", { ascending: false });

      if (error) throw error;
      setAttempts(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching results",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!confirm("Are you sure you want to delete this result?")) return;

    try {
      const { error } = await supabase
        .from("student_attempts")
        .delete()
        .eq("id", attemptId);

      if (error) throw error;

      toast({
        title: "Result deleted",
      });
      fetchAttempts();
    } catch (error: any) {
      toast({
        title: "Error deleting result",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredAttempts = selectedExam === "all"
    ? attempts
    : attempts.filter((a) => a.exam_id === selectedExam);

  const completedAttempts = filteredAttempts.filter((a) => a.is_completed);
  const inProgressAttempts = filteredAttempts.filter((a) => !a.is_completed);

  const getExamTitle = (examId: string) => {
    return exams.find((e) => e.id === examId)?.title || "Unknown Exam";
  };

  const getScorePercentage = (score: number | null, total: number | null) => {
    if (score === null || total === null || total === 0) return 0;
    return Math.round((score / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="text-3xl font-display font-bold">{filteredAttempts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-display font-bold">{completedAttempts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-display font-bold">{inProgressAttempts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filter by exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={fetchAttempts} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Student Results</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAttempts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No results yet. Results will appear here in real-time as students complete exams.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>4th Subject</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">{attempt.student_name}</TableCell>
                    <TableCell>{attempt.student_phone}</TableCell>
                    <TableCell>{getExamTitle(attempt.exam_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{attempt.selected_subject}</Badge>
                    </TableCell>
                    <TableCell>
                      {attempt.is_completed ? (
                        <span className="font-semibold">
                          {attempt.score}/{attempt.total_questions} ({getScorePercentage(attempt.score, attempt.total_questions)}%)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={attempt.is_completed ? "default" : "secondary"}>
                        {attempt.is_completed ? "Completed" : "In Progress"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(attempt.started_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAttempt(attempt.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveResults;
