import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "./integrations/supabase/client";
import { GraduationCap, Clock, BookOpen, Users, ArrowRight, Sparkles, Shield, Target } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

const Index = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Smart Steps</span>
          </Link>
          <Link to="/admin/login">
            <Button variant="outline" size="sm" className="gap-2">
              <Shield className="w-4 h-4" />
              Admin
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium animate-fade-in">
              <Sparkles className="w-4 h-4 mr-2 inline" />
              Nigeria's Premier Tutorial Center
            </Badge>
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight animate-fade-in-up">
              Take Your Next
              <span className="text-gradient-hero block">Smart Step</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Practice with our comprehensive mock exams designed to prepare you for success in JAMB, WAEC, and NECO examinations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <a href="#exams">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 gap-2 shadow-glow">
                  Start Practice Exam
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Target className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-xl">Exam-Style Questions</CardTitle>
                <CardDescription>
                  Practice with questions modeled after real JAMB, WAEC, and NECO exams
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl bg-gradient-success flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Clock className="w-7 h-7 text-success-foreground" />
                </div>
                <CardTitle className="font-display text-xl">Timed Practice</CardTitle>
                <CardDescription>
                  Build exam stamina with realistic time constraints and pressure
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="font-display text-xl">4 Key Subjects</CardTitle>
                <CardDescription>
                  English, Physics, Chemistry, plus your choice of Maths or Biology
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Available Exams Section */}
      <section id="exams" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Available Now</Badge>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Mock Exams
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Select a mock exam below to begin your practice session. No login required.
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-10 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : exams.length === 0 ? (
            <Card className="max-w-lg mx-auto text-center py-12">
              <CardContent>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">No Exams Available</h3>
                <p className="text-muted-foreground">
                  Check back soon for new mock exams!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam, index) => (
                <Card 
                  key={exam.id} 
                  className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-card animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary" className="mb-2">
                        Mock Exam
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {exam.duration_minutes} mins
                      </div>
                    </div>
                    <CardTitle className="font-display text-xl group-hover:text-primary transition-colors">
                      {exam.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        4 Subjects
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        180 Questions
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to={`/exam/${exam.id}/register`}>
                      <Button className="w-full bg-gradient-primary hover:opacity-90 gap-2 group-hover:shadow-glow transition-all">
                        Start Exam
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">Smart Steps Tutorials</span>
            </div>
            <p className="text-sidebar-foreground/70 text-sm">
              © {new Date().getFullYear()} Smart Steps Tutorials. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
