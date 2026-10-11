import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  FileText, Upload, Download, RefreshCw, Trash2, Loader2, FileUp
} from 'lucide-react';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function ConceptTab() {
  const { currentMember } = useMemberAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: docs = [], refetch } = useQuery({
    queryKey: ['concept-documents'],
    queryFn: () => base44.entities.ConceptDocument.list('-created_date', 10),
  });

  const current = docs[0] || null;

  useEffect(() => {
    let active = true;
    const loadUrl = async () => {
      if (!current) { setSignedUrl(null); return; }
      setLoadingUrl(true);
      try {
        const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: current.file_uri });
        if (active) setSignedUrl(res.signed_url);
      } catch (e) {
        if (active) setSignedUrl(null);
      } finally {
        if (active) setLoadingUrl(false);
      }
    };
    loadUrl();
    return () => { active = false; };
  }, [current?.id]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'Nur PDF-Dateien', description: 'Bitte lade eine PDF-Datei hoch.', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const up = await base44.integrations.Core.UploadPrivateFile({ file });
      // Replace: delete previous document(s), then create the new one
      if (docs.length > 0) {
        await base44.entities.ConceptDocument.deleteMany({ id: { $in: docs.map(d => d.id) } });
      }
      await base44.entities.ConceptDocument.create({
        file_uri: up.file_uri,
        file_name: file.name,
        uploaded_by_name: currentMember?.name || 'Admin'
      });
      await queryClient.invalidateQueries({ queryKey: ['concept-documents'] });
      toast({ title: 'Konzept-PDF aktualisiert', description: file.name });
    } catch (err) {
      toast({ title: 'Fehler beim Hochladen', description: err?.message || String(err), variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.ConceptDocument.delete(deleteTarget.id);
    setDeleteTarget(null);
    setSignedUrl(null);
    queryClient.invalidateQueries({ queryKey: ['concept-documents'] });
    toast({ title: 'Konzept-PDF gelöscht' });
  };

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFile} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Konzept-PDF
          </h3>
          <p className="text-sm text-muted-foreground">Lade das Festival-Konzept als PDF hoch. Es kann jederzeit ersetzt werden.</p>
        </div>
        <div className="flex gap-2">
          {current && (
            <Button variant="outline" size="sm" asChild>
              <a href={signedUrl || '#'} download={current.file_name} target="_blank" rel="noreferrer">
                <Download className="w-4 h-4 mr-1.5" />Herunterladen
              </a>
            </Button>
          )}
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : current ? <RefreshCw className="w-4 h-4 mr-1.5" /> : <Upload className="w-4 h-4 mr-1.5" />}
            {current ? 'Ersetzen' : 'Hochladen'}
          </Button>
        </div>
      </div>

      {!current ? (
        <Card className="border-dashed">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <FileUp className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Noch kein Konzept-PDF</p>
              <p className="text-xs text-muted-foreground mt-1">Lade die aktuelle Konzept-PDF hoch, damit das Team sie hier einsehen kann.</p>
            </div>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
              PDF auswählen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-rose-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{current.file_name}</p>
                  <p className="text-xs text-muted-foreground">Hochgeladen von {current.uploaded_by_name || 'Admin'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">PDF</Badge>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => setDeleteTarget(current)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vorschau</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUrl ? (
                <div className="h-[70vh] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : signedUrl ? (
                <iframe src={signedUrl} title="Konzept-PDF Vorschau" className="w-full h-[70vh] rounded-md border" />
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  Vorschau nicht verfügbar. Bitte über „Herunterladen" öffnen.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konzept-PDF löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteTarget?.file_name}" wird entfernt. Du kannst jederzeit ein neues PDF hochladen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}