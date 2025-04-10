import { FC, ReactNode, useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { exportToPdf, exportToText, ExportOptions } from '@/lib/document-export';
import { useToast } from '@/hooks/use-toast';
import { FileTextIcon, LoaderIcon, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ExportFormat = 'pdf' | 'text';

interface ExportButtonProps extends Omit<ButtonProps, 'onClick'> {
  targetRef: React.RefObject<HTMLElement>;
  options?: ExportOptions;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
  children?: ReactNode;
  buttonText?: string;
  defaultFormat?: ExportFormat;
  showFormatOptions?: boolean;
}

export const ExportButton: FC<ExportButtonProps> = ({
  targetRef,
  options,
  onExportStart,
  onExportComplete,
  onExportError,
  children,
  buttonText = 'Export',
  defaultFormat = 'pdf',
  showFormatOptions = true,
  className,
  ...buttonProps
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: ExportFormat = defaultFormat) => {
    if (!targetRef?.current) {
      toast({
        title: "Export Failed",
        description: "No content found to export",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);
      onExportStart?.();

      console.log(`Starting export to ${format} format`);

      switch (format) {
        case 'pdf':
          await exportToPdf(targetRef.current, options);
          toast({
            title: "PDF Exported",
            description: "Your document has been exported to PDF format.",
          });
          break;
        case 'text':
          exportToText(targetRef.current, options);
          toast({
            title: "Text File Exported",
            description: "Your document has been exported as a text file.",
          });
          break;
        default:
          throw new Error(`Unknown export format: ${format}`);
      }

      onExportComplete?.();
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An error occurred during export",
        variant: "destructive",
      });
      
      onExportError?.(error instanceof Error ? error : new Error('Export failed'));
    } finally {
      setIsExporting(false);
    }
  };

  // If showing format options, render a dropdown menu
  if (showFormatOptions) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting}
            className={cn("flex items-center gap-1", className)}
            {...buttonProps}
          >
            {isExporting ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <FileTextIcon className="h-4 w-4" />
            )}
            {children || buttonText}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            <span>Export as PDF</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('text')} disabled={isExporting}>
            <FileIcon className="mr-2 h-4 w-4" />
            <span>Export as Text File</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Otherwise, render a simple button for the default format
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleExport()}
      disabled={isExporting}
      className={cn("flex items-center gap-1", className)}
      {...buttonProps}
    >
      {isExporting ? (
        <LoaderIcon className="h-4 w-4 animate-spin" />
      ) : (
        <FileTextIcon className="h-4 w-4" />
      )}
      {children || buttonText}
    </Button>
  );
};