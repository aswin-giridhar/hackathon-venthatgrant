import { FC, ReactNode, useRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { exportToPdf, exportTableToPdf, PdfExportOptions } from '@/lib/pdf-export';
import { useToast } from '@/hooks/use-toast';
import { FileTextIcon, LoaderIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PdfExportButtonProps extends Omit<ButtonProps, 'onClick'> {
  targetRef?: React.RefObject<HTMLElement>; // Element to export to PDF
  tableData?: any[]; // For table export
  tableColumns?: { header: string; dataKey: string }[]; // For table export
  options?: PdfExportOptions; // Optional PDF options
  exportType?: 'element' | 'table';
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
  children?: ReactNode;
  buttonText?: string;
  fileName?: string;
}

export const PdfExportButton: FC<PdfExportButtonProps> = ({
  targetRef,
  tableData,
  tableColumns,
  options,
  exportType = 'element',
  onExportStart,
  onExportComplete,
  onExportError,
  children,
  buttonText = 'Export to PDF',
  fileName,
  className,
  ...buttonProps
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast: showToast } = useToast();

  const handleExport = async () => {
    try {
      // Validate that we have the necessary references or data
      if (exportType === 'element' && !targetRef?.current) {
        console.error('PDF Export Error: No target element provided');
        throw new Error('No target element provided for PDF export');
      }

      if (exportType === 'table' && (!tableData || !tableColumns)) {
        console.error('PDF Export Error: Missing table data or columns');
        throw new Error('Missing table data or columns for PDF export');
      }

      console.log('PDF Export: Starting export process', {
        exportType,
        targetRefExists: !!targetRef?.current,
        targetElement: targetRef?.current?.tagName,
        targetElementChildren: targetRef?.current?.children?.length,
        targetElementContent: targetRef?.current?.textContent?.substring(0, 100) + '...',
        options: options
      });

      setIsExporting(true);
      onExportStart?.();

      // Apply custom filename if provided
      const exportOptions = { 
        ...options,
        ...(fileName ? { filename: fileName } : {})
      };

      if (exportType === 'element' && targetRef?.current) {
        await exportToPdf(targetRef.current, exportOptions);
      } else if (exportType === 'table' && tableData && tableColumns) {
        exportTableToPdf(tableData, tableColumns, exportOptions);
      }

      showToast({
        title: "Export Successful",
        description: "Your document has been exported to PDF.",
      });

      onExportComplete?.();
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      
      showToast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An error occurred during export",
        variant: "destructive",
      });
      
      onExportError?.(error instanceof Error ? error : new Error('Export failed'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className={cn("flex items-center gap-2", className)}
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