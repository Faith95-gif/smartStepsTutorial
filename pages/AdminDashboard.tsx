import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "./integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Plus, LogOut, Clock, BookOpen, Users, Trash2, Eye, Loader2, Settings } from "lucide-react";
import CreateExamDialog from "./components/admin/CreateExamDialog";
import ExamQuestionsManager from "./components/admin/ExamQuestionsManager";
import LiveResults from "./components/admin/LiveResults";

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

const AdminDashboard = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("exams");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchExams();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin/login");
      return;
    }

    // Verify admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      await supabase.auth.signOut();
      navigate("/admin/login");
    }
  };

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching exams",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm("Are you sure you want to delete this exam? This will also delete all associated questions and results.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("exams")
        .delete()
        .eq("id", examId);

      if (error) throw error;

      toast({
        title: "Exam deleted",
        description: "The exam has been successfully deleted.",
      });
      fetchExams();
    } catch (error: any) {
      toast({
        title: "Error deleting exam",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleExamStatus = async (exam: Exam) => {
    try {
      const { error } = await supabase
        .from("exams")
        .update({ is_active: !exam.is_active })
        .eq("id", exam.id);

      if (error) throw error;

      toast({
        title: exam.is_active ? "Exam deactivated" : "Exam activated",
        description: `${exam.title} is now ${exam.is_active ? "inactive" : "active"}.`,
      });
      fetchExams();
    } catch (error: any) {
      toast({
        title: "Error updating exam",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Smart Steps Tutorials</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm">
                View Site
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="exams" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Exams
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-2">
                <Users className="w-4 h-4" />
                Live Results
              </TabsTrigger>
            </TabsList>
            {activeTab === "exams" && (
              <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-primary hover:opacity-90 gap-2">
                <Plus className="w-4 h-4" />
                Create Exam
              </Button>
            )}
          </div>

          <TabsContent value="exams" className="space-y-6">
            {selectedExam ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => setSelectedExam(null)}>
                    ← Back to Exams
                  </Button>
                  <h2 className="font-display text-2xl font-bold">{selectedExam.title}</h2>
                </div>
                <ExamQuestionsManager exam={selectedExam} />
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : exams.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">No Exams Created</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first mock exam to get started.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Exam
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => (
                  <Card key={exam.id} className="group hover:shadow-lg transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Badge variant={exam.is_active ? "default" : "secondary"}>
                          {exam.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => toggleExamStatus(exam)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteExam(exam.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="font-display">{exam.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {exam.duration_minutes} mins
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => setSelectedExam(exam)}
                      >
                        <Eye className="w-4 h-4" />
                        Manage Questions
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            <LiveResults exams={exams} />
          </TabsContent>
        </Tabs>
      </main>

      <CreateExamDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchExams}
      />
    </div>
  );
};

export default AdminDashboard;