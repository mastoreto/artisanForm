// Shared by /llms.txt and /llms-full.txt (llmstxt.org format), English docs only.
import { getCollection } from 'astro:content';

export const summary =
  'ArtisanForm is a React library for declarative multi-step forms (wizards): a JSON-serializable schema, 30+ field types, validation with React Hook Form + Yup, step state in Zustand, payments and file uploads through pluggable integrations, and themeable UI kits. It never handles secrets or card data. 0.x beta, not published to a registry yet.';

export async function englishDocs() {
  const docs = await getCollection(
    'docs',
    ({ id }) => id === 'docs' || id.startsWith('docs/'),
  );
  return docs.sort((a, b) => a.id.localeCompare(b.id));
}

export const urlOf = (site: URL | undefined, id: string) =>
  new URL(`/${id.replace(/\/?index$/, '')}/`, site).href;
