import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Trash2, Edit2, Upload, Copy, FileJson } from "lucide-react";
import AddQuestionDialog from "./AddQuestionDialog";

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
  correct_answer: string;
  question_order: number;
}

interface BulkQuestion {
  question: string;
  options: string[];
  correct: number;
  difficulty?: string;
}

const SUBJECTS = ["English", "Physics", "Chemistry", "Maths", "Biology"] as const;
const SUBJECT_QUESTION_COUNTS: Record<string, number> = {
  English: 60,
  Physics: 40,
  Chemistry: 40,
  Maths: 40,
  Biology: 40,
};

const ExamQuestionsManager = ({ exam }: { exam: Exam }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string>("English");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [bulkImportText, setBulkImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [showExampleDialog, setShowExampleDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuestions();
  }, [exam.id]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("exam_id", exam.id)
        .order("question_order", { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching questions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    setImportLoading(true);
    try {
      // Parse the JavaScript array
      let parsedQuestions: BulkQuestion[] = [];
      
      // Clean the input text
      let cleanedText = bulkImportText.trim();
      
      // Remove variable declaration if present (const PhysicsQuestions = [...])
      cleanedText = cleanedText.replace(/^(const|let|var)\s+\w+\s*=\s*/, '');
      
      // Remove semicolon at the end if present
      cleanedText = cleanedText.replace(/;?\s*$/, '');
      
      // Use Function constructor to safely evaluate the JavaScript array
      // This handles all JavaScript syntax including special characters
      try {
        const evalFunc = new Function('return ' + cleanedText);
        parsedQuestions = evalFunc();
      } catch (evalError) {
        // If Function constructor fails, show helpful error
        throw new Error('Invalid JavaScript array format. Please check your syntax.');
      }

      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error("Invalid format: Expected an array of questions");
      }

      // Get the current max order number for the active subject
      const subjectQuestions = getSubjectQuestions(activeSubject);
      const maxOrder = subjectQuestions.length > 0 
        ? Math.max(...subjectQuestions.map(q => q.question_order))
        : 0;

      // Validate and transform questions
      const questionsToInsert = parsedQuestions.map((q, index) => {
        if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`Invalid question format at index ${index + 1}`);
        }

        const correctIndex = q.correct;
        if (correctIndex < 0 || correctIndex > 3) {
          throw new Error(`Invalid correct answer index at question ${index + 1}. Must be 0-3.`);
        }

        const correctAnswerMap = ['A', 'B', 'C', 'D'];
        
        return {
          exam_id: exam.id,
          subject: activeSubject,
          question_text: q.question,
          option_a: q.options[0],
          option_b: q.options[1],
          option_c: q.options[2],
          option_d: q.options[3],
          correct_answer: correctAnswerMap[correctIndex],
          question_order: maxOrder + index + 1,
        };
      });

      // Insert all questions
      const { error } = await supabase
        .from("questions")
        .insert(questionsToInsert);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `Successfully imported ${questionsToInsert.length} questions to ${activeSubject}.`,
      });

      setBulkImportText("");
      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error importing questions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;

      toast({
        title: "Question deleted",
      });
      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error deleting question",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSubjectQuestions = (subject: string) => {
    return questions.filter((q) => q.subject === subject);
  };

  const getSubjectProgress = (subject: string) => {
    const count = getSubjectQuestions(subject).length;
    const total = SUBJECT_QUESTION_COUNTS[subject];
    return { count, total, percentage: Math.round((count / total) * 100) };
  };

  const exampleFormat = `const PhysicsQuestions = [
    {
        question: "A ripple tank produces waves of frequency 12 Hz and wavelength 5 cm. What is the wave speed?",
        options: [
            "0.6 m/s",
            "2.4 m/s",
            "60 m/s",
            "240 m/s"
        ],
        correct: 1
    },
    {
        question: "Which of the following statements about transverse waves is correct?",
        options: [
            "The particles vibrate parallel to the direction of propagation.",
            "They cannot travel through a vacuum.",
            "They require a material medium.",
            "The particles vibrate perpendicular to the direction of propagation."
        ],
        correct: 3
    }
];`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Paste Area */}
      <Card className="border-2 border-dashed border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Quick Import - Paste {activeSubject} Questions Here
              </CardTitle>
              <CardDescription className="mt-1">
                Paste your questions array and click Import to automatically add questions to <strong>{activeSubject}</strong>
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowExampleDialog(true)}
              className="gap-2"
            >
              <FileJson className="w-4 h-4" />
              View Format
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Paste your ${activeSubject} questions here, for example:

const ${activeSubject}Questions = [
    {
        question: "Your question?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct: 1
    }
];`}
            value={bulkImportText}
            onChange={(e) => setBulkImportText(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Format: question, options (array of 4), correct (0=A, 1=B, 2=C, 3=D)
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setBulkImportText("")}
                disabled={!bulkImportText.trim()}
              >
                Clear
              </Button>
              <Button 
                onClick={handleBulkImport}
                disabled={!bulkImportText.trim() || importLoading}
                className="bg-gradient-primary gap-2"
                size="sm"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import to {activeSubject}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-5 gap-4">
        {SUBJECTS.map((subject) => {
          const progress = getSubjectProgress(subject);
          return (
            <Card key={subject} className="text-center">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-1">{subject}</p>
                <p className="text-2xl font-display font-bold">
                  {progress.count}/{progress.total}
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-primary h-2 rounded-full transition-all"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subject Tabs */}
      <Tabs value={activeSubject} onValueChange={setActiveSubject}>
        <div className="flex items-center justify-between">
          <TabsList>
            {SUBJECTS.map((subject) => (
              <TabsTrigger key={subject} value={subject} className="gap-2">
                {subject}
                <Badge variant="secondary" className="ml-1">
                  {getSubjectQuestions(subject).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            onClick={() => {
              setEditingQuestion(null);
              setShowAddDialog(true);
            }}
            className="bg-gradient-primary gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Single Question
          </Button>
        </div>

        {SUBJECTS.map((subject) => (
          <TabsContent key={subject} value={subject} className="space-y-4">
            {getSubjectQuestions(subject).length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    No questions added for {subject} yet.
                  </p>
                  <Button
                    onClick={() => {
                      setEditingQuestion(null);
                      setShowAddDialog(true);
                    }}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Question
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {getSubjectQuestions(subject).map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Q{index + 1}</Badge>
                            <Badge variant="secondary" className="text-xs">
                              Answer: {question.correct_answer}
                            </Badge>
                          </div>
                          <p className="font-medium">{question.question_text}</p>
                          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                            <p className={question.correct_answer === "A" ? "text-success font-medium" : "text-muted-foreground"}>
                              A. {question.option_a}
                            </p>
                            <p className={question.correct_answer === "B" ? "text-success font-medium" : "text-muted-foreground"}>
                              B. {question.option_b}
                            </p>
                            <p className={question.correct_answer === "C" ? "text-success font-medium" : "text-muted-foreground"}>
                              C. {question.option_c}
                            </p>
                            <p className={question.correct_answer === "D" ? "text-success font-medium" : "text-muted-foreground"}>
                              D. {question.option_d}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingQuestion(question);
                              setShowAddDialog(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Format Example Dialog */}
      <Dialog open={showExampleDialog} onOpenChange={setShowExampleDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Format Example</DialogTitle>
            <DialogDescription>
              Copy this format and paste it in the import area above
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute right-2 top-2 gap-2 z-10"
                onClick={() => {
                  navigator.clipboard.writeText(exampleFormat);
                  toast({
                    title: "Copied to clipboard",
                    description: "Example format copied successfully",
                  });
                }}
              >
                <Copy className="w-4 h-4" />
                Copy Example
              </Button>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                <code>{exampleFormat}</code>
              </pre>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="font-semibold mb-2 text-sm">Quick Guide:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Select the subject tab you want to add questions to</li>
                <li>Copy the example format above or use your own</li>
                <li>Replace with your questions and options</li>
                <li>Set correct answer: 0=A, 1=B, 2=C, 3=D</li>
                <li>Paste in the import box and click "Import to [Subject]"</li>
              </ol>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold">Format Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Each question must have: question, options (array of 4), correct (0-3)</li>
                <li>Options must be an array with exactly 4 strings</li>
                <li>Correct uses 0-based indexing: 0=A, 1=B, 2=C, 3=D</li>
                <li>Variable declaration (const PhysicsQuestions = ...) is optional</li>
                <li>Questions will be added to the currently selected subject tab</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowExampleDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddQuestionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        examId={exam.id}
        defaultSubject={activeSubject}
        editingQuestion={editingQuestion}
        onSuccess={fetchQuestions}
      />
    </div>
  );
};

export default ExamQuestionsManager;