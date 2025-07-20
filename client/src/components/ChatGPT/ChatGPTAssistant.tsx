import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, Send, Brain, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatGPTAssistantProps {
  analysisResult?: any;
  postContent?: string;
}

const ChatGPTAssistant: React.FC<ChatGPTAssistantProps> = ({ 
  analysisResult, 
  postContent 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const { toast } = useToast();

  // Check if API key is available
  React.useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const response = await fetch('/api/chatgpt/check');
      const data = await response.json();
      setHasApiKey(data.hasApiKey);
    } catch (error) {
      console.error('Error checking API key:', error);
      setHasApiKey(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatgpt/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          context: {
            analysisResult,
            postContent,
            appName: 'NostrMood'
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error responses
        if (response.status === 429) {
          let errorMessage = "OpenAI API quota exceeded. Please add credits to your OpenAI account.";
          let errorTitle = "API Quota Exceeded";
          
          if (data.code === 'quota_exceeded') {
            errorMessage = data.error + " " + (data.suggestion || "");
          }
          
          toast({
            title: errorTitle,
            description: errorMessage,
            variant: "destructive"
          });
          
          // Add helpful message to chat
          const errorChatMessage: ChatMessage = {
            role: 'assistant',
            content: `❌ **API Quota Exceeded**

Your OpenAI API key has run out of credits. To continue using ChatGPT features:

1. Visit [OpenAI Billing](https://platform.openai.com/settings/organization/billing)
2. Add at least $5 in credits to your account
3. Try your question again

Each conversation costs about $0.002, so $5 covers ~2,500 conversations.`,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, errorChatMessage]);
          return;
        }
        
        throw new Error(data.error || 'Failed to get response from ChatGPT');
      }
      
      if (data.error) {
        let errorMessage = data.error;
        let errorTitle = "ChatGPT Error";
        
        if (data.code === 'quota_exceeded') {
          errorTitle = "API Quota Exceeded";
          errorMessage = "Your OpenAI API key has exceeded its usage quota. Please add credits to your OpenAI account or wait for your quota to reset.";
        }
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to ChatGPT. Please check your internet connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startContextualChat = () => {
    if (!analysisResult) return;

    const contextMessage = `I'm analyzing this Nostr post:

Content: "${postContent}"
Sentiment Score: ${analysisResult.sentiment.comparative.toFixed(3)}
Sentiment: ${analysisResult.sentiment.comparative > 0.6 ? 'Positive' : analysisResult.sentiment.comparative < -0.6 ? 'Negative' : 'Neutral'}
Positive words: ${analysisResult.sentiment.positive.join(', ') || 'None'}
Negative words: ${analysisResult.sentiment.negative.join(', ') || 'None'}

Can you provide insights about this sentiment analysis and suggest trading strategies for prediction markets?`;

    setInput(contextMessage);
  };

  const quickPrompts = [
    "Explain this sentiment analysis in simple terms",
    "What trading strategies would work for this sentiment?",
    "How reliable is this sentiment score?",
    "What factors could change this sentiment?",
    "Suggest improvements for sentiment analysis accuracy"
  ];

  if (!hasApiKey) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ChatGPT Assistant
          </CardTitle>
          <CardDescription>
            AI-powered analysis and insights for your sentiment data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>API Key Required:</strong> To use ChatGPT features, you need to provide an OpenAI API key.
              </p>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium mb-1">Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Get API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a></li>
                  <li>Add credits at <a href="https://platform.openai.com/settings/organization/billing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Billing</a> (minimum $5)</li>
                  <li>Add API key to environment variables</li>
                  <li>Restart the application</li>
                </ol>
              </div>
              <p className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <strong>Cost:</strong> ~$0.002 per conversation. $5 covers ~2,500 conversations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          ChatGPT Assistant
          <Badge variant="outline" className="ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </CardTitle>
        <CardDescription>
          Get AI insights about sentiment analysis and trading strategies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat Messages */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Start a conversation with ChatGPT</p>
              {analysisResult && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={startContextualChat}
                  className="mt-2"
                >
                  Analyze Current Sentiment
                </Button>
              )}
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">ChatGPT is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Prompts:</p>
            <div className="grid gap-2">
              {quickPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(prompt)}
                  className="text-left justify-start h-auto p-2 whitespace-normal text-xs"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask ChatGPT about sentiment analysis, trading strategies, or anything else..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Tips:</strong> Ask about sentiment patterns, market predictions, 
            or get explanations about the analysis results.
          </p>
          <p className="mt-1 opacity-75">
            Too broke to pay for OpenAI API 💀
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatGPTAssistant;