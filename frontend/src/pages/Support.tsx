import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageCircle,
  Lock,
  HelpCircle,
  FileText,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Support() {
  const { toast } = useToast();

  const handleTelegramChat = () => {
    window.open('https://t.me/@estrellabluesky', '_blank');
  };

  const handlePasswordReset = () => {
    // This would typically integrate with your password reset flow
    toast({
      title: "Password Reset",
      description: "Please check your email for password reset instructions.",
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Support Center</h1>
        <p className="text-muted-foreground">Get help with your account and investments</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Live Chat Support
            </CardTitle>
            <CardDescription>Chat with our support team on Telegram</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              onClick={handleTelegramChat}
            >
              Open Telegram Chat
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Password Reset
            </CardTitle>
            <CardDescription>Reset your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handlePasswordReset}
            >
              Reset Password
            </Button>
          </CardContent>
        </Card>

        
      </div>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">How do I start investing?</h3>
            <p className="text-sm text-muted-foreground">
              To start investing, simply deposit funds into your account and choose your preferred forex pair. Our platform will guide you through the process.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">What are the minimum investment amounts?</h3>
            <p className="text-sm text-muted-foreground">
              Minimum investment amounts vary by forex pair. Check our investment options for detailed information.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">How does the referral program work?</h3>
            <p className="text-sm text-muted-foreground">
              Earn rewards by inviting others to join. You'll receive both one-time rewards and daily commissions from their investments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentation
            </CardTitle>
            <CardDescription>Learn more about our platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="link" className="h-auto p-0">Platform Guide</Button>
            <Button variant="link" className="h-auto p-0">Investment Terms</Button>
            <Button variant="link" className="h-auto p-0">API Documentation</Button>
          </CardContent>
        </Card>

        
      </div>
    </div>
  );
} 