import { useEffect, useId, useRef, useState } from 'react';
import { type ArtisanLabels, defaultLabels } from '../../../commons/labels';
import { useArtisanField } from '../../../engine/form/useArtisanField';
import type {
  StorageAdapter,
  UploadedFile,
} from '../../../integrations/storage/types';
import { FieldBox, FieldError, FieldHelp } from '../../ui/FieldParts';
import { useCx } from '../../ui/UiContext';

interface FileUploadProps {
  id: string;
  name: string;
  label: string;
  storage?: StorageAdapter;
  /** Comma-separated types/extensions, like the native `accept`. */
  accept?: string;
  /** Maximum size per file, in bytes. */
  maxSize?: number;
  /** 1 (default) replaces the file; more allows several. */
  maxFiles?: number;
  /** Show previews of image files. */
  preview?: boolean;
  capture?: 'user' | 'environment';
  disabled?: boolean;
  helperText?: string;
  className?: string;
  labels?: Pick<
    ArtisanLabels,
    | 'dropFiles'
    | 'chooseFiles'
    | 'fileUploading'
    | 'fileTooLarge'
    | 'fileWrongType'
    | 'tooManyFiles'
    | 'removeFile'
    | 'cancelUpload'
    | 'retryUpload'
    | 'uploadFailed'
    | 'noStorage'
  >;
}

interface Pending {
  key: string;
  file: File;
  status: 'uploading' | 'error';
  progress: number;
  error?: string;
  preview?: string;
  controller: AbortController;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const matchesAccept = (file: File, accept?: string) => {
  if (!accept) return true;
  return accept.split(',').some((raw) => {
    const rule = raw.trim().toLowerCase();
    if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule);
    if (rule.endsWith('/*')) return file.type.startsWith(rule.slice(0, -1));
    return file.type === rule;
  });
};

const FileUpload = ({
  id,
  name,
  label,
  storage,
  accept,
  maxSize,
  maxFiles = 1,
  preview = false,
  capture,
  disabled,
  helperText,
  className,
  labels = defaultLabels,
}: FileUploadProps) => {
  const pendingRef = useRef<Pending[]>([]);
  const [pending, setPendingState] = useState<Pending[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const cx = useCx();

  const setPending = (updater: (prev: Pending[]) => Pending[]) => {
    pendingRef.current = updater(pendingRef.current);
    setPendingState(pendingRef.current);
  };

  // A running upload blocks "Next" through a field-level validator.
  const [field, meta, helpers] = useArtisanField<UploadedFile[]>(name, {
    validate: () =>
      pendingRef.current.some((p) => p.status === 'uploading')
        ? labels.fileUploading
        : undefined,
  });
  const files = field.value ?? [];
  // Uploads finish concurrently: always append to the latest list, not to a stale render.
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = field.value ?? [];
  }, [field.value]);
  const commit = (next: UploadedFile[]) => {
    filesRef.current = next;
    helpers.setValue(next);
    helpers.setTouched();
  };
  // While uploading, "required" would mislead: say what is actually pending.
  const uploading = pending.some((p) => p.status === 'uploading');
  const error =
    meta.touched && meta.error
      ? uploading
        ? labels.fileUploading
        : meta.error
      : null;

  useEffect(
    () => () => {
      for (const p of pendingRef.current) {
        p.controller.abort();
        if (p.preview) URL.revokeObjectURL(p.preview);
      }
    },
    [],
  );

  const startUpload = async (item: Pending) => {
    if (!storage) return;
    try {
      const done = await storage.upload(item.file, {
        signal: item.controller.signal,
        onProgress: (progress) =>
          setPending((prev) =>
            prev.map((p) => (p.key === item.key ? { ...p, progress } : p)),
          ),
      });
      setPending((prev) => prev.filter((p) => p.key !== item.key));
      if (item.preview) URL.revokeObjectURL(item.preview);
      commit(maxFiles === 1 ? [done] : [...filesRef.current, done]);
    } catch (e) {
      if (item.controller.signal.aborted) return;
      setPending((prev) =>
        prev.map((p) =>
          p.key === item.key
            ? {
                ...p,
                status: 'error',
                error: e instanceof Error ? e.message : labels.uploadFailed,
              }
            : p,
        ),
      );
    }
  };

  const addFiles = (incoming: File[]) => {
    setNotice(null);
    if (!storage) return setNotice(labels.noStorage);
    const room =
      maxFiles === 1
        ? 1
        : maxFiles - filesRef.current.length - pendingRef.current.length;
    const accepted: File[] = [];
    for (const file of incoming) {
      if (!matchesAccept(file, accept)) return setNotice(labels.fileWrongType);
      if (maxSize && file.size > maxSize)
        return setNotice(labels.fileTooLarge(formatSize(maxSize)));
      accepted.push(file);
    }
    if (accepted.length > room) return setNotice(labels.tooManyFiles(maxFiles));
    if (maxFiles === 1) {
      for (const p of pendingRef.current) p.controller.abort();
      setPending(() => []);
    }
    const items = accepted.map<Pending>((file) => ({
      key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      status: 'uploading',
      progress: 0,
      controller: new AbortController(),
      preview:
        preview && file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
    }));
    setPending((prev) => [...prev, ...items]);
    for (const item of items) void startUpload(item);
  };

  const cancel = (item: Pending) => {
    item.controller.abort();
    if (item.preview) URL.revokeObjectURL(item.preview);
    setPending((prev) => prev.filter((p) => p.key !== item.key));
  };

  const retry = (item: Pending) => {
    const fresh = {
      ...item,
      status: 'uploading' as const,
      progress: 0,
      error: undefined,
      controller: new AbortController(),
    };
    setPending((prev) => prev.map((p) => (p.key === item.key ? fresh : p)));
    void startUpload(fresh);
  };

  const remove = async (file: UploadedFile) => {
    commit(filesRef.current.filter((f) => f.id !== file.id));
    try {
      await storage?.remove?.(file);
    } catch {
      // the form no longer references it; server-side cleanup is best-effort
    }
  };

  const describedBy =
    [error && `${id}-error`, helperText && `${id}-help`, hintId]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <FieldBox
      id={id}
      label={label}
      helperText={helperText}
      error={error}
      errorCode={meta.code}
      className={className}
    >
      <span id={`${id}-label`} className={cx('label')}>
        {label}
      </span>
      <section
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(Array.from(e.dataTransfer.files));
        }}
        className={cx('dropzone')}
        data-dragging={dragging || undefined}
      >
        <span>{labels.dropFiles} </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cx('link')}
          data-strong
        >
          {labels.chooseFiles}
        </button>
        <input
          ref={inputRef}
          id={id}
          type="file"
          hidden
          accept={accept}
          multiple={maxFiles > 1}
          capture={capture}
          disabled={disabled}
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </section>
      <p id={hintId} className={cx('srOnly')}>
        {[accept, maxSize && formatSize(maxSize), maxFiles > 1 && `${maxFiles}`]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <FieldHelp id={id} text={helperText} />
      <ul className={cx('fileList')} aria-live="polite">
        {files.map((f) => (
          <li key={f.id} className={cx('fileItem')}>
            {preview && f.url && f.type?.startsWith('image/') && (
              <img src={f.url} alt="" className={cx('fileThumb')} />
            )}
            <span className={cx('fileName')}>{f.name}</span>
            <span className={cx('muted')}>{formatSize(f.size)}</span>
            <button
              type="button"
              className={cx('link')}
              disabled={disabled}
              onClick={() => void remove(f)}
              aria-label={labels.removeFile(f.name)}
            >
              ×
            </button>
          </li>
        ))}
        {pending.map((p) => (
          <li key={p.key} className={cx('fileItem')}>
            {p.preview && p.status === 'uploading' && (
              <img src={p.preview} alt="" className={cx('fileThumb')} />
            )}
            <span className={cx('fileName')}>{p.file.name}</span>
            {p.status === 'uploading' ? (
              <>
                <div
                  role="progressbar"
                  aria-label={p.file.name}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={p.progress}
                  className={cx('progress')}
                >
                  <div
                    className={cx('progressBar')}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                <button
                  type="button"
                  className={cx('link')}
                  onClick={() => cancel(p)}
                  aria-label={labels.cancelUpload(p.file.name)}
                >
                  ×
                </button>
              </>
            ) : (
              <>
                <span role="alert" className={cx('error')} data-inline>
                  {p.error ?? labels.uploadFailed}
                </span>
                <button
                  type="button"
                  className={cx('link')}
                  onClick={() => retry(p)}
                  aria-label={labels.retryUpload(p.file.name)}
                >
                  ↻
                </button>
                <button
                  type="button"
                  className={cx('link')}
                  onClick={() => cancel(p)}
                  aria-label={labels.cancelUpload(p.file.name)}
                >
                  ×
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {notice && (
        <p role="alert" className={cx('error')}>
          {notice}
        </p>
      )}
      <FieldError id={id} error={error} />
    </FieldBox>
  );
};

export default FileUpload;
