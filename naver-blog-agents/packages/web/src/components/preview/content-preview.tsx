'use client';

import { useState } from 'react';
import { Copy, Download, Check, Code, FileText, FileJson } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ContentPreviewProps {
  content: {
    title: string;
    seoTitle: string;
    metaDescription: string;
    tags: string[];
    formats: {
      naverHtml: string;
      markdown: string;
      json: any;
    };
    metadata: {
      wordCount: number;
      readingTime: number;
      seoScore: number;
    };
  };
}

export function ContentPreview({ content }: ContentPreviewProps) {
  const { toast } = useToast();
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const copyToClipboard = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      toast({
        variant: 'success',
        title: '복사 완료',
        description: `${format} 형식이 클립보드에 복사되었습니다.`,
      });
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: '복사 실패',
        description: '클립보드 복사에 실패했습니다.',
      });
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      variant: 'success',
      title: '다운로드 완료',
      description: `${filename} 파일이 다운로드되었습니다.`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Title Preview */}
      <div>
        <h3 className="text-xl font-bold">{content.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{content.metaDescription}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {content.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-naver-green-light text-naver-green px-2 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground border-t border-b py-3">
        <span>📝 {content.metadata.wordCount}자</span>
        <span>⏱️ {content.metadata.readingTime}분</span>
        <span className="text-naver-green">🎯 SEO {content.metadata.seoScore}점</span>
      </div>

      {/* Format Tabs */}
      <Tabs defaultValue="html" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="html" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            <span className="hidden sm:inline">HTML</span>
          </TabsTrigger>
          <TabsTrigger value="markdown" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Markdown</span>
          </TabsTrigger>
          <TabsTrigger value="json" className="flex items-center gap-2">
            <FileJson className="w-4 h-4" />
            <span className="hidden sm:inline">JSON</span>
          </TabsTrigger>
        </TabsList>

        {/* HTML Tab */}
        <TabsContent value="html" className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
              {content.formats.naverHtml}
            </pre>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(content.formats.naverHtml, 'HTML')}
            >
              {copiedFormat === 'HTML' ? (
                <Check className="w-4 h-4 mr-2 text-naver-green" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              복사
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadFile(content.formats.naverHtml, 'content.html', 'text/html')
              }
            >
              <Download className="w-4 h-4 mr-2" />
              다운로드
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 네이버 스마트에디터 HTML 모드에 붙여넣기 하세요
          </p>
        </TabsContent>

        {/* Markdown Tab */}
        <TabsContent value="markdown" className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
              {content.formats.markdown}
            </pre>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(content.formats.markdown, 'Markdown')}
            >
              {copiedFormat === 'Markdown' ? (
                <Check className="w-4 h-4 mr-2 text-naver-green" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              복사
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadFile(content.formats.markdown, 'content.md', 'text/markdown')
              }
            >
              <Download className="w-4 h-4 mr-2" />
              다운로드
            </Button>
          </div>
        </TabsContent>

        {/* JSON Tab */}
        <TabsContent value="json" className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
              {JSON.stringify(content.formats.json, null, 2)}
            </pre>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(JSON.stringify(content.formats.json, null, 2), 'JSON')
              }
            >
              {copiedFormat === 'JSON' ? (
                <Check className="w-4 h-4 mr-2 text-naver-green" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              복사
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadFile(
                  JSON.stringify(content.formats.json, null, 2),
                  'content.json',
                  'application/json'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              다운로드
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
