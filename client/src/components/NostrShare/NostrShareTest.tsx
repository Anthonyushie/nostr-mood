import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { MessageCircle, Share, Copy, Check } from 'lucide-react';

declare global {
  interface Window {
    SWHandler?: any;
  }
}

interface NostrShareTestProps {
  testContent?: string;
}

const NostrShareTest: React.FC<NostrShareTestProps> = ({ 
  testContent = "Testing NostrMood sharing functionality! #NostrMood #Test" 
}) => {
  const [shareStatus, setShareStatus] = useState<{
    widget: boolean | null;
    extension: boolean | null;
    clipboard: boolean | null;
  }>({
    widget: null,
    extension: null,
    clipboard: null
  });

  const testWidgetMode = () => {
    try {
      const isInWidget = window.location !== window.parent.location || 
                        window.frameElement !== null ||
                        window.location.ancestorOrigins?.length > 0;
      
      const hasWidgetHandler = typeof window.SWHandler !== 'undefined' && 
                              window.SWHandler?.client?.requestEventPublish;

      console.log('Widget mode detection:', {
        isInWidget,
        hasWidgetHandler,
        ancestorOrigins: window.location.ancestorOrigins,
        frameElement: window.frameElement
      });

      return { isInWidget, hasWidgetHandler };
    } catch (error) {
      console.error('Widget mode detection error:', error);
      return { isInWidget: false, hasWidgetHandler: false };
    }
  };

  const testYakiHonneShare = async () => {
    setShareStatus(prev => ({ ...prev, widget: null }));
    
    try {
      const { isInWidget, hasWidgetHandler } = testWidgetMode();
      
      if (!hasWidgetHandler) {
        setShareStatus(prev => ({ ...prev, widget: false }));
        toast({
          title: "YakiHonne Not Available",
          description: "Smart Widget Handler not found or not in widget mode",
          variant: "destructive"
        });
        return;
      }

      const eventDraft = {
        content: testContent,
        tags: [['t', 'nostrmood'], ['t', 'test']],
        kind: 1,
        created_at: Math.floor(Date.now() / 1000)
      };

      await window.SWHandler.client.requestEventPublish(
        eventDraft, 
        window.location.ancestorOrigins?.[0] || '*'
      );
      
      setShareStatus(prev => ({ ...prev, widget: true }));
      toast({
        title: "YakiHonne Share Requested",
        description: "Event publishing request sent to YakiHonne",
      });
    } catch (error) {
      console.error('YakiHonne share error:', error);
      setShareStatus(prev => ({ ...prev, widget: false }));
      toast({
        title: "YakiHonne Share Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const testNostrExtension = async () => {
    setShareStatus(prev => ({ ...prev, extension: null }));
    
    try {
      if (typeof window === 'undefined' || !(window as any).nostr) {
        setShareStatus(prev => ({ ...prev, extension: false }));
        toast({
          title: "Nostr Extension Not Found",
          description: "No Nostr browser extension detected",
          variant: "destructive"
        });
        return;
      }

      const eventDraft = {
        content: testContent,
        tags: [['t', 'nostrmood'], ['t', 'test']],
        kind: 1,
        created_at: Math.floor(Date.now() / 1000)
      };

      const signedEvent = await (window as any).nostr.signEvent(eventDraft);
      console.log('Signed event:', signedEvent);
      
      setShareStatus(prev => ({ ...prev, extension: true }));
      toast({
        title: "Nostr Extension Success",
        description: "Event signed successfully with browser extension",
      });
    } catch (error) {
      console.error('Nostr extension error:', error);
      setShareStatus(prev => ({ ...prev, extension: false }));
      toast({
        title: "Nostr Extension Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const testClipboard = async () => {
    setShareStatus(prev => ({ ...prev, clipboard: null }));
    
    try {
      await navigator.clipboard.writeText(testContent);
      setShareStatus(prev => ({ ...prev, clipboard: true }));
      toast({
        title: "Copied to Clipboard",
        description: "Content copied successfully",
      });
    } catch (error) {
      console.error('Clipboard error:', error);
      setShareStatus(prev => ({ ...prev, clipboard: false }));
      toast({
        title: "Clipboard Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return null;
    return status ? <Check className="h-4 w-4 text-green-500" /> : <span className="text-red-500">✗</span>;
  };

  const getStatusBadge = (status: boolean | null, label: string) => {
    if (status === null) return <Badge variant="outline">{label}</Badge>;
    if (status) return <Badge className="bg-green-500 text-white">{label} ✓</Badge>;
    return <Badge variant="destructive">{label} ✗</Badge>;
  };

  return (
    <div className="w-full space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              onClick={testYakiHonneShare}
              variant="outline"
              size="sm"
              className="flex-1 mr-2"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Test YakiHonne
            </Button>
            {getStatusIcon(shareStatus.widget)}
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={testNostrExtension}
              variant="outline"
              size="sm"
              className="flex-1 mr-2"
            >
              <Share className="h-4 w-4 mr-2" />
              Test Extension
            </Button>
            {getStatusIcon(shareStatus.extension)}
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={testClipboard}
              variant="outline"
              size="sm"
              className="flex-1 mr-2"
            >
              <Copy className="h-4 w-4 mr-2" />
              Test Clipboard
            </Button>
            {getStatusIcon(shareStatus.clipboard)}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Status:</h4>
          <div className="flex flex-wrap gap-2">
            {getStatusBadge(shareStatus.widget, "YakiHonne")}
            {getStatusBadge(shareStatus.extension, "Extension")}
            {getStatusBadge(shareStatus.clipboard, "Clipboard")}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Test Content:</strong></p>
          <p className="bg-muted p-2 rounded">{testContent}</p>
        </div>
    </div>
  );
};

export default NostrShareTest;