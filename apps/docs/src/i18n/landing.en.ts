// Landing copy (English). `landing.es.ts` must keep the exact same shape.
import { project } from '../data/project';

const pm =
  'npm install artisanform react react-dom react-hook-form yup zustand';

export const en = {
  lang: 'en' as 'en' | 'es',
  home: '/',
  docsHref: '/docs/',
  otherLang: { label: 'Español', href: '/es/' },
  meta: {
    title: 'ArtisanForm: declarative multi-step forms for React',
    description:
      'Describe the form, launch the wizard. A React library for multi-step forms from a JSON-serializable schema: 30+ field types, Yup validation, payments, drafts and UI kits.',
    imageAlt: 'ArtisanForm: describe the form, launch the wizard',
  },
  nav: {
    label: 'Main',
    items: [
      { label: 'Docs', href: '/docs/' },
      { label: 'Live demo', href: '#demo' },
      { label: 'UI kits', href: '#kits' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Changelog', href: `${project.repo}/blob/main/CHANGELOG.md` },
    ],
    docsCta: 'Search the docs',
    github: 'GitHub',
  },
  hero: {
    badge: 'Forged for modern React · React 18 & 19',
    titleA: 'Describe the form.',
    titleB: 'Launch the wizard.',
    lead: 'The declarative TypeScript library for complex multi-step flows, onboarding and checkouts, without tying you to any UI.',
    install: {
      command: pm,
      copy: 'Copy',
      copied: 'Copied!',
      label: 'Install command',
    },
    primary: { label: 'Get started', href: '/docs/' },
    secondary: { label: 'View on GitHub', href: project.repo },
    chips: [
      { icon: 'verified', text: 'Typed schema + Yup validation' },
      { icon: 'bolt', text: 'Compiled with React Compiler' },
      { icon: 'lock', text: 'Never touches secrets or card data' },
      { icon: 'package-2', text: 'Plain-CSS core, any UI kit' },
    ],
  },
  demo: {
    id: 'demo',
    eyebrow: 'Live workbench',
    icon: 'precision-manufacturing',
    title: 'Forge it live: a declarative wizard',
    lead: 'Define the shape of your steps in TypeScript and watch the same wizard run on the right. Try the validation.',
    kitLabel: 'Rendered with',
    kitName: '@beardartisans/ui-tailwind',
    codeFile: 'checkoutForge.schema.ts',
    codeBadge: 'TypeScript',
    codeFooter: ['Validation built in', 'Zero secrets at runtime'],
    code: `import { ArtisanForm, defineForm } from 'artisanform';

export const checkoutForge = defineForm({
  schemaVersion: 1,
  id: 'saas-checkout',
  steps: [
    {
      id: 'account',
      type: 'form',
      title: 'Account',
      fields: [
        {
          name: 'project',
          type: 'text',
          label: 'Project name',
          required: true,
          validation: { minLength: 3 },
        },
        { name: 'email', type: 'email', label: 'Admin email', required: true },
      ],
    },
    {
      id: 'params',
      type: 'form',
      title: 'Settings',
      fields: [
        {
          name: 'kit',
          type: 'select',
          label: 'UI kit',
          options: [
            { value: 'tailwind', label: 'Tailwind CSS' },
            { value: 'shadcn', label: 'shadcn/ui' },
            { value: 'mui', label: 'Material UI' },
          ],
        },
        { name: 'strict', type: 'switch', label: 'Strict validation' },
      ],
    },
    { id: 'confirm', type: 'review', title: 'Review' },
  ],
});

<ArtisanForm scheme={checkoutForge} onSubmit={save} persistKey="checkout" />;`,
    wizard: {
      title: 'Interactive preview',
      reset: 'Reset',
      back: 'Back',
      next: 'Next step',
      finish: 'Submit',
      done: 'Submitted. In your app, ArtisanForm calls your typed onSubmit(values).',
      stepsLabel: 'Wizard progress',
      steps: ['Account', 'Settings', 'Review'],
      projectLabel: 'Project name',
      projectHint: 'Validated with minLength: 3',
      projectError: 'Use at least 3 characters.',
      emailLabel: 'Admin email',
      emailError: 'Enter a valid email address.',
      kitLabel: 'UI kit',
      kits: ['Tailwind CSS', 'shadcn/ui', 'Material UI', 'Bootstrap', 'SCSS'],
      strictLabel: 'Strict validation',
      strictHint: 'Runs your beforeNext hook before moving on',
      draftTitle: 'Draft autosaved (persistKey)',
      draftHint: 'Reload and continue where you left off',
      reviewTitle: 'Review',
      reviewRows: ['Project', 'Email', 'UI kit', 'Strict'],
      yes: 'Yes',
      no: 'No',
      defaults: {
        project: 'Forge-Ornn-SaaS',
        email: 'artisan@forge-systems.io',
      },
    },
  },
  features: {
    eyebrow: 'Precision engineering',
    icon: 'hardware',
    title: 'Built for demanding flows',
    lead: 'Drop the repetitive state, step and sync boilerplate. ArtisanForm gives you a tested base with no lock-in.',
    items: [
      {
        icon: 'code-blocks',
        title: 'Declarative schema',
        text: 'Write it in TypeScript with defineForm for compile-time safety, or receive plain JSON from an API and validate it at runtime with parseArtisanSchema.',
        foot: 'Strict inference',
        tag: 'defineForm()',
      },
      {
        icon: 'widgets',
        title: '30+ field types',
        text: 'Text, email, password, combobox, multiselect, range, OTP, rating, file and image uploads through pluggable storage, and repeatable rows.',
        foot: 'Ready to use',
        tag: 'fields: [...]',
      },
      {
        icon: 'alt-route',
        title: 'Conditional logic and steps',
        text: 'Declarative visibleWhen conditions: no eval, no opaque callbacks. Terms, payment (Stripe, Lemon Squeezy, Mercado Pago, PayPal), waiting, review and result steps.',
        foot: 'No side effects',
        tag: 'visibleWhen',
      },
      {
        icon: 'history-edu',
        title: 'Automatic drafts',
        text: 'persistKey stores versioned draft snapshots so users can reload and continue. Secrets such as passwords are never written to a draft.',
        foot: 'Privacy by design',
        tag: 'persistKey',
      },
      {
        icon: 'accessibility-new',
        title: 'Accessible by contract',
        text: 'Labels tied to controls, aria-invalid and aria-describedby on errors, and focus on the first invalid field. Every kit is checked with a shared conformance suite.',
        foot: 'Keyboard friendly',
        tag: 'aria-invalid',
      },
      {
        icon: 'layers',
        title: 'UI-library agnostic',
        text: 'Ships with plain CSS by default. Switch to Tailwind, shadcn/ui, Material UI, Bootstrap or Sass by passing a single kit prop.',
        foot: 'No vendor lock-in',
        tag: 'kit={...}',
      },
    ],
  },
  kits: {
    id: 'kits',
    eyebrow: 'Component ecosystem',
    icon: 'palette',
    title: 'Change design system in one line',
    lead: 'Clean precedence: default styles first, then your kit, and finally your own props.',
    precedence: ['Precedence:', 'Base CSS', 'kit={...}', 'Overrides'],
    listLabel: 'UI kits',
    items: [
      {
        id: 'tailwind',
        badge: 'Official',
        name: 'Tailwind CSS',
        text: 'Utility classes on top of unstyled markup.',
        pkg: '@beardartisans/ui-tailwind',
        title: 'Tailwind CSS',
        code: `// npm install @beardartisans/ui-tailwind
import { ArtisanForm } from 'artisanform';
import { tailwindKit } from '@beardartisans/ui-tailwind';

export default function App() {
  return <ArtisanForm scheme={scheme} onSubmit={save} kit={tailwindKit} />;
}`,
      },
      {
        id: 'shadcn',
        badge: 'Copy and paste',
        name: 'shadcn/ui',
        text: 'A kit file that maps your own shadcn components.',
        pkg: 'artisanform-kit.json',
        title: 'shadcn/ui',
        code: `// npx shadcn add <your-host>/artisanform-kit.json
import { ArtisanForm } from 'artisanform';
import { shadcnKit } from '@/components/artisanform-kit';

export default function App() {
  return <ArtisanForm scheme={scheme} onSubmit={save} kit={shadcnKit} />;
}`,
      },
      {
        id: 'mui',
        badge: 'npm',
        name: 'Material UI',
        text: 'MUI controls inside FormControl.',
        pkg: '@beardartisans/ui-mui',
        title: 'Material UI',
        code: `// npm install @beardartisans/ui-mui @mui/material @emotion/react @emotion/styled
import { ArtisanForm } from 'artisanform';
import { muiKit } from '@beardartisans/ui-mui';

export default function App() {
  return <ArtisanForm scheme={scheme} onSubmit={save} kit={muiKit} />;
}`,
      },
      {
        id: 'bootstrap',
        badge: 'npm',
        name: 'Bootstrap 5',
        text: 'Classes only, no react-bootstrap.',
        pkg: '@beardartisans/ui-bootstrap',
        title: 'Bootstrap 5',
        code: `// npm install @beardartisans/ui-bootstrap
import { ArtisanForm } from 'artisanform';
import { bootstrapKit } from '@beardartisans/ui-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@beardartisans/ui-bootstrap/style.css';

export default function App() {
  return <ArtisanForm scheme={scheme} onSubmit={save} kit={bootstrapKit} />;
}`,
      },
      {
        id: 'scss',
        badge: 'npm',
        name: 'Sass',
        text: 'Emit the --artisan-* tokens from your theme.',
        pkg: '@beardartisans/ui-scss',
        title: 'Sass',
        code: `// npm install @beardartisans/ui-scss sass
@use '@beardartisans/ui-scss' as af;

:root {
  @include af.theme((primary: #7c3aed));
}`,
      },
      {
        id: 'css',
        badge: 'Zero deps',
        name: 'Plain CSS',
        text: 'Themeable with --artisan-* variables.',
        pkg: 'artisanform/style.css',
        title: 'Plain CSS',
        code: `// No extra dependencies: just the base stylesheet.
import { ArtisanForm } from 'artisanform';
import 'artisanform/style.css';

export default function App() {
  return <ArtisanForm scheme={scheme} onSubmit={save} />;
}`,
      },
    ],
  },
  compat: {
    eyebrow: 'Compatibility matrix',
    title: 'Made for modern React',
    lead: 'No obsolete polyfills, and nothing blocks your move to React 19.',
    head: ['Requirement', 'Supported', 'Status'],
    rows: [
      ['React and React DOM', project.peers.react, 'Peer'],
      ['JavaScript modules', 'Pure ESM, no CommonJS build', 'ESM only'],
      ['Types', 'Strict TypeScript declarations included', 'Typed'],
      [
        'Peer dependencies',
        `react-hook-form ${project.peers['react-hook-form']}, yup ${project.peers.yup}, zustand ${project.peers.zustand}`,
        'Peer',
      ],
      [
        'React Compiler',
        'The published build is compiled with it',
        'Optimized',
      ],
    ],
    callouts: [
      {
        icon: 'shield-locked',
        title: 'Zero-secrets guarantee',
        text: 'ArtisanForm never receives or stores card data or secret keys. Amounts, orders and upload signatures are resolved by your backend, and charges go through the official Stripe, Lemon Squeezy, Mercado Pago or PayPal SDKs.',
      },
      {
        icon: 'memory',
        title: 'React Compiler build',
        text: 'The npm bundle is pre-compiled with the official React Compiler, so you get targeted re-renders without touching your own build pipeline.',
      },
    ],
    status: {
      icon: 'release-alert',
      title: `Project status: v${project.version}`,
      text: 'Active development toward 1.0.',
      cta: 'Changelog',
      href: `${project.repo}/blob/main/CHANGELOG.md`,
    },
  },
  minimal: {
    eyebrow: 'Minimal working example',
    title: 'One file to your first wizard',
    lead: 'A single file, with no proprietary stylesheet to fight in production.',
    file: 'ContactWizard.tsx',
    copy: 'Copy',
    copied: 'Copied!',
    code: `import { ArtisanForm, defineForm } from 'artisanform';
import 'artisanform/style.css';

const form = defineForm({
  schemaVersion: 1,
  id: 'contact',
  steps: [
    {
      id: 'main',
      type: 'form',
      title: 'Contact',
      fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
    },
  ],
});

export default function ContactPage() {
  return <ArtisanForm scheme={form} onSubmit={(values) => saveToDatabase(values)} />;
}`,
  },
  faq: {
    id: 'faq',
    eyebrow: 'FAQ',
    title: 'Frequently asked questions',
    items: [
      {
        q: 'What is ArtisanForm?',
        a: 'A React library for building multi-step forms (wizards) from a declarative, JSON-serializable schema. It ships ready-made inputs, validation with React Hook Form and Yup, step state in Zustand, payment and file-upload integrations, and swappable UI kits.',
      },
      {
        q: 'Which React versions does it support?',
        a: `Peer range ${project.peers.react}: React 18.3.1 and later, including React 19.`,
      },
      {
        q: 'Does it handle payments or card data?',
        a: 'No. The library never handles secrets or card data. Amounts, orders and upload signatures are resolved by your backend; the payment step only wires the official provider SDKs, which are optional peers.',
      },
      {
        q: 'Can the form schema come from an API?',
        a: 'Yes. The v1 schema is plain, serializable JSON. Use parseArtisanSchema to validate it at runtime, or defineForm for type-checked schemas written in code.',
      },
      {
        q: 'Can I use my own design system?',
        a: 'Yes. Official kits exist for Tailwind CSS, shadcn/ui, Material UI, Bootstrap and Sass, and you can override components, classNames, labels or go unstyled.',
      },
      {
        q: 'Is it published to npm yet?',
        a: `Not yet: it is a ${project.version} beta and the release workflow is being finalized. Follow the repository for the first publish.`,
      },
    ],
  },
  cta: {
    title: 'Start forging your wizards today',
    lead: 'Try it in under two minutes. Fully typed, no complex setup.',
    primary: { label: 'Read the docs', href: '/docs/' },
    secondary: { label: 'Star on GitHub', href: project.repo },
    foot: 'Open source under the MIT license. Built by and for developers.',
  },
  footer: {
    title: 'ArtisanForm',
    text: 'Forged for complex flows and strictly typed validation.',
    chips: ['React 18 / 19', 'ESM only'],
    repo: 'GitHub repository',
    llms: 'llms.txt',
    year: new Date().getFullYear(),
  },
};

export type LandingCopy = typeof en;
