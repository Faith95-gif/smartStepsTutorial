import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Database } from "../../integrations/supabase/types";

type ExamSubject = Database["public"]["Enums"]["exam_subject"];

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

interface AddQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  defaultSubject: string;
  editingQuestion: Question | null;
  onSuccess: () => void;
}

const SUBJECTS: ExamSubject[] = ["English", "Physics", "Chemistry", "Maths", "Biology"];

const AddQuestionDialog = ({
  open,
  onOpenChange,
  examId,
  defaultSubject,
  editingQuestion,
  onSuccess,
}: AddQuestionDialogProps) => {
  const [subject, setSubject] = useState<ExamSubject>(defaultSubject as ExamSubject);
  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState<"A" | "B" | "C" | "D">("A");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editingQuestion) {
      setSubject(editingQuestion.subject as ExamSubject);
      setQuestionText(editingQuestion.question_text);
      setOptionA(editingQuestion.option_a);
      setOptionB(editingQuestion.option_b);
      setOptionC(editingQuestion.option_c);
      setOptionD(editingQuestion.option_d);
      setCorrectAnswer(editingQuestion.correct_answer as "A" | "B" | "C" | "D");
    } else {
      setSubject(defaultSubject as ExamSubject);
      setQuestionText("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectAnswer("A");
    }
  }, [editingQuestion, defaultSubject, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      toast({
        title: "All fields required",
        description: "Please fill in all question fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from("questions")
          .update({
            subject,
            question_text: questionText.trim(),
            option_a: optionA.trim(),
            option_b: optionB.trim(),
            option_c: optionC.trim(),
            option_d: optionD.trim(),
            correct_answer: correctAnswer,
          })
          .eq("id", editingQuestion.id);

        if (error) throw error;

        toast({
          title: "Question updated",
        });
      } else {
        // Get current question count for ordering
        const { data: existingQuestions } = await supabase
          .from("questions")
          .select("id")
          .eq("exam_id", examId)
          .eq("subject", subject);

        const order = (existingQuestions?.length || 0) + 1;

        const { error } = await supabase.from("questions").insert({
          exam_id: examId,
          subject,
          question_text: questionText.trim(),
          option_a: optionA.trim(),
          option_b: optionB.trim(),
          option_c: optionC.trim(),
          option_d: optionD.trim(),
          correct_answer: correctAnswer,
          question_order: order,
        });

        if (error) throw error;

        toast({
          title: "Question added",
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error saving question",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editingQuestion ? "Edit Question" : "Add New Question"}
          </DialogTitle>
          <DialogDescription>
            {editingQuestion
              ? "Update the question details below."
              : "Fill in the question details. All fields are required."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select value={subject} onValueChange={(val) => setSubject(val as ExamSubject)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              placeholder="Enter the question text..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="optionA">Option A</Label>
              <Input
                id="optionA"
                placeholder="Option A"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="optionB">Option B</Label>
              <Input
                id="optionB"
                placeholder="Option B"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="optionC">Option C</Label>
              <Input
                id="optionC"
                placeholder="Option C"
                value={optionC}
                onChange={(e) => setOptionC(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="optionD">Option D</Label>
              <Input
                id="optionD"
                placeholder="Option D"
                value={optionD}
                onChange={(e) => setOptionD(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <RadioGroup
              value={correctAnswer}
              onValueChange={(val) => setCorrectAnswer(val as "A" | "B" | "C" | "D")}
              className="flex gap-6"
            >
              {["A", "B", "C", "D"].map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`answer-${option}`} />
                  <Label htmlFor={`answer-${option}`} className="font-normal">
                    Option {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingQuestion ? (
                "Update Question"
              ) : (
                "Add Question"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddQuestionDialog;
