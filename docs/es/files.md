# Archivos y storage

> 🌐 Versión en español de [files.md](../files.md) (el original, en inglés, es la referencia). Si cambia el original, actualizá esta copia.

Los campos `file` y `image` suben cada archivo **apenas se elige** y guardan en el formulario un descriptor chico y serializable, nunca el `File` en sí. A dónde van los bytes lo decide un `StorageAdapter` que aportás vos.

## El principio

La librería **nunca guarda credenciales de storage**. Tu backend firma la subida (o usás un preset sin firma y restringido) y el navegador envía el archivo directo al servicio de storage.

> Validar tipo y tamaño en el navegador es solo UX. Tu servidor tiene que validar el MIME real y el tamaño, y escanear los archivos, antes de confiar en ellos.

## El campo

```ts
{ type: 'file', name: 'dni', label: 'DNI (PDF)', accept: 'application/pdf', maxSize: 2 * 1024 * 1024, required: true }
{ type: 'image', name: 'photos', label: 'Fotos', maxFiles: 3, helperText: 'Hasta 3 imágenes' }
```

| Prop | Significado |
| --- | --- |
| `accept` | Tipos aceptados, como en `<input accept>` |
| `maxSize` | Tamaño máximo por archivo, en bytes |
| `maxFiles` | `1` (por defecto) reemplaza el archivo; un número mayor permite varios |
| `minFiles` | Cantidad mínima de archivos, para la validación |
| `capture` | Pide a los navegadores móviles que abran la cámara |
| `storage` | Clave del adaptador a usar, cuando pasás varios |

El usuario tiene arrastrar y soltar, vistas previas para imágenes, barra de progreso, cancelar, reintentar y quitar. El botón **Siguiente** espera a que terminen todas las subidas, y una subida fallida muestra su error con un botón *Reintentar*.

Lo que guarda el formulario (y lo que recibe `onSubmit`) es un descriptor:

```ts
{ id: string; name: string; size: number; type?: string; url?: string }
```

Es JSON plano, así que es seguro en los borradores (`persistKey`) y en un payload hacia tu API.

## Elegir a dónde van los archivos

Pasá un adaptador, o un mapa de adaptadores y elegí uno por campo con `storage: 'clave'`:

```tsx
import { ArtisanForm, presignedPut, cloudinary } from 'artisanform';

const s3 = presignedPut({
  getUploadUrl: async (file) => {
    const r = await fetch('/api/upload-url', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, type: file.type }),
    });
    return r.json(); // { url, headers?, method?, fileUrl?, id? }
  },
});

const cl = cloudinary({ cloudName: 'demo', uploadPreset: 'my_unsigned_preset' });

<ArtisanForm scheme={scheme} storage={{ default: s3, images: cl }} onSubmit={save} />;
```

### `presignedPut`: S3, R2, Backblaze B2, MinIO…

Funciona con cualquier storage compatible con S3. Tu `getUploadUrl(file)` le pide a **tu backend** una URL prefirmada; el backend guarda las credenciales y devuelve:

| Campo | Obligatorio | Significado |
| --- | --- | --- |
| `url` | sí | URL prefirmada a la que sube el navegador |
| `method` | no | `PUT` (por defecto) o `POST` |
| `headers` | no | Headers que exige la firma, como `Content-Type` |
| `fileUrl` | no | URL final legible del objeto, si la hay |
| `id` | no | Tu identificador del objeto (por defecto, la clave o la URL) |

Pasá `remove(file)` para borrar del storage a través de tu backend cuando el usuario quita un archivo.

### `cloudinary`

`cloudinary({ cloudName, uploadPreset })` usa un preset sin firma, o una firma de tu backend con `getSignature`. Restringí el preset sin firma en Cloudinary (formatos, tamaño, carpeta), porque cualquiera que conozca el nombre del preset puede subir.

### Tu propio adaptador

Sirve cualquier objeto con esta forma para otro servicio:

```ts
interface StorageAdapter {
  id: string;
  upload(file: File, opts: { onProgress(percent: number): void; signal: AbortSignal }): Promise<UploadedFile>;
  remove?(file: UploadedFile): Promise<void>;
}
```

Informá el progreso de 0 a 100 con `onProgress`, y detenete cuando `signal` aborte (el usuario canceló o quitó el archivo).

## Pruebas

`mockStorage({ delay, fail })` simula subidas para demos, stories y tests: informa progreso, no guarda nada, y falla con los archivos para los que tu `fail(file)` devuelve `true`. En tests de punta a punta, un reloj pausado (`page.clock`) mantiene una subida "en curso" para que un test pueda comprobar el estado de bloqueo sin competir con el timer.
