import type { ArtisanSchemaV1, WaitStrategy } from 'artisanform';
import { confirmation } from '../payments';
import type { Built, Ctx, Example } from './types';

type Step = ArtisanSchemaV1['steps'][number];
type Field = Extract<Step, { type: 'form' }>['fields'][number];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
/** `o('Madrid', 'Lisbon')` → options whose value is the slugged label. */
const o = (...labels: string[]) =>
  labels.map((label) => ({ value: slug(label), label }));
const eq = (field: string, value: string | number | boolean) =>
  ({ field, operator: 'eq', value }) as const;
const today = () => new Date().toISOString().slice(0, 10);

/** The way every example ends: a message and a way to try it again. */
const done = (message: string): Step => ({
  id: 'done',
  type: 'result',
  title: 'Done',
  message,
  actions: [{ label: 'Start over', action: 'restart' }],
});
const restartOnly = (ctx: Ctx) => ({ actions: { restart: ctx.restart } });

/** A stand-in for "something external finishes" (bank, back office, e-mail…). */
const settle = (ms: number, failFirst = false): WaitStrategy => {
  let attempts = 0;
  return {
    subscribe: (onStatus) => {
      attempts += 1;
      const failing = failFirst && attempts === 1;
      const t = setTimeout(
        () =>
          onStatus(
            failing
              ? { status: 'failed', message: 'The service did not answer' }
              : { status: 'success' },
          ),
        ms,
      );
      return () => clearTimeout(t);
    },
  };
};

const name: Field = {
  type: 'text',
  name: 'name',
  label: 'Full name',
  required: true,
};
const email: Field = {
  type: 'email',
  name: 'email',
  label: 'Email',
  required: true,
};
const terms = (what: string): Step => ({
  id: 'terms',
  type: 'terms',
  title: 'Terms',
  content: `By continuing you agree to the ${what}. This is demo text: nothing is sent anywhere.`,
  accept: { label: 'I accept' },
});

// ---------------------------------------------------------------- Registration

const signup = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'signup',
    steps: [
      {
        id: 'account',
        type: 'form',
        title: 'Create your account',
        fields: [
          name,
          email,
          {
            type: 'password',
            name: 'password',
            label: 'Password',
            required: true,
            validation: { minLength: 8 },
          },
          {
            type: 'password',
            name: 'confirm',
            label: 'Repeat the password',
            required: true,
            validation: { sameAs: 'password' },
          },
        ],
      },
      terms('terms of service'),
      done('Welcome aboard! Check your inbox to verify the address.'),
    ],
  },
  extensions: restartOnly(ctx),
});

const eventFields: Field[] = [
  {
    type: 'radio',
    name: 'session',
    label: 'Session',
    required: true,
    options: o('Morning workshop', 'Afternoon talks', 'Full day'),
  },
  { type: 'switch', name: 'guest', label: 'I bring a guest' },
  {
    type: 'text',
    name: 'guestName',
    label: 'Guest name',
    required: true,
    visibleWhen: eq('guest', true),
  },
  {
    type: 'check',
    name: 'diet',
    label: 'Dietary needs',
    options: o('Vegetarian', 'Vegan', 'Gluten free'),
  },
];

const signupEvent = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'signup-event',
    steps: [
      { id: 'account', type: 'form', title: 'You', fields: [name, email] },
      { id: 'event', type: 'form', title: 'The event', fields: eventFields },
      { id: 'review', type: 'review', title: 'Review' },
      done('You are registered. A calendar invite is on its way.'),
    ],
  },
  extensions: restartOnly(ctx),
});

// -------------------------------------------------------------------- Payments

/** Free tickets skip payment and confirmation; the backend prices `plan`. */
const signupEventPaid = (ctx: Ctx): Built => {
  const paid = { field: 'plan', operator: 'neq', value: 'free' } as const;
  return {
    scheme: {
      schemaVersion: 1,
      id: 'signup-event-paid',
      steps: [
        { id: 'account', type: 'form', title: 'You', fields: [name, email] },
        {
          id: 'ticket',
          type: 'form',
          title: 'Ticket',
          fields: [
            {
              type: 'radio',
              name: 'plan',
              label: 'Ticket (the backend sets the price: pro, team)',
              required: true,
              options: [
                { value: 'free', label: 'Community (free)' },
                { value: 'pro', label: 'Individual' },
                { value: 'team', label: 'Team' },
              ],
            },
          ],
        },
        {
          id: 'payment',
          type: 'payment',
          title: 'Payment',
          visibleWhen: paid,
          providers: ctx.plugins.map((p) => p.id),
          summary: ctx.real
            ? 'Sandbox providers: nothing real is charged.'
            : 'No provider configured: this is the mock. See .env.example to try a real sandbox.',
        },
        {
          id: 'confirming',
          type: 'wait',
          title: 'Confirming',
          visibleWhen: paid,
          strategy: ctx.real ? 'payment-status' : 'mock',
          message: 'Confirming the payment…',
          timeoutMs: 180_000,
        },
        done('Payment confirmed and seat reserved.'),
      ],
    },
    extensions: {
      ...restartOnly(ctx),
      waits: { 'payment-status': confirmation, mock: settle(1200) },
    },
  };
};

// ---------------------------------------------------------------------- Product

const survey = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'survey',
    steps: [
      {
        id: 'overall',
        type: 'form',
        title: 'How was it?',
        fields: [
          {
            type: 'rating',
            name: 'satisfaction',
            label: 'Overall satisfaction',
            required: true,
          },
          {
            type: 'range',
            name: 'nps',
            label: 'How likely are you to recommend us? (0-10)',
            defaultValue: 8,
            validation: { min: 0, max: 10 },
          },
        ],
      },
      {
        id: 'unhappy',
        type: 'form',
        title: 'What went wrong?',
        visibleWhen: { field: 'satisfaction', operator: 'lt', value: 4 },
        fields: [
          {
            type: 'check',
            name: 'areas',
            label: 'Where?',
            options: o('Pricing', 'Support', 'Speed', 'Missing features'),
          },
          {
            type: 'textarea',
            name: 'issue',
            label: 'Tell us more',
            required: true,
          },
        ],
      },
      {
        id: 'happy',
        type: 'form',
        title: 'What did you like?',
        visibleWhen: { field: 'satisfaction', operator: 'gte', value: 4 },
        fields: [
          {
            type: 'textarea',
            name: 'liked',
            label: 'Anything we should keep doing?',
          },
          { type: 'switch', name: 'quote', label: 'We may quote you' },
        ],
      },
      done('Thanks, your answers were recorded.'),
    ],
  },
  extensions: restartOnly(ctx),
});

const crm = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'crm-lead',
    steps: [
      {
        id: 'lead',
        type: 'form',
        title: 'Contact',
        hooks: { beforeNext: 'dedupe' },
        fields: [
          name,
          {
            ...email,
            description: 'Try ana@existing.com to see the duplicate check',
          },
          { type: 'text', name: 'company', label: 'Company', required: true },
        ],
      },
      {
        id: 'qualify',
        type: 'form',
        title: 'Qualification',
        fields: [
          {
            type: 'radio',
            name: 'size',
            label: 'Company size',
            required: true,
            options: [
              { value: 'small', label: '1-10 people' },
              { value: 'mid', label: '11-200 people' },
              { value: 'large', label: '200+ people' },
            ],
          },
          {
            type: 'select',
            name: 'budget',
            label: 'Yearly budget',
            options: o('Under 5k', '5k-50k', 'Over 50k'),
          },
        ],
        // The edges decide the branch; the steps below are only reachable this way.
        next: [
          { when: eq('size', 'large'), to: 'enterprise' },
          { when: eq('size', 'small'), to: 'selfserve' },
          { to: 'demo' },
        ],
      },
      {
        id: 'enterprise',
        type: 'form',
        title: 'Enterprise desk',
        visibleWhen: eq('size', 'large'),
        fields: [
          {
            type: 'select',
            name: 'region',
            label: 'Region',
            options: o('Americas', 'Europe', 'Asia-Pacific'),
          },
          {
            type: 'textarea',
            name: 'requirements',
            label: 'Security or compliance requirements',
          },
        ],
      },
      {
        id: 'selfserve',
        type: 'form',
        title: 'Start on your own',
        visibleWhen: eq('size', 'small'),
        fields: [
          {
            type: 'callout',
            name: 'note',
            text: 'A 14-day trial is enough for a team your size.',
            variant: 'info',
          },
          { type: 'checkbox', name: 'trial', label: 'Send me the trial link' },
        ],
      },
      {
        id: 'demo',
        type: 'form',
        title: 'Book a demo',
        visibleWhen: { field: 'size', operator: 'neq', value: 'small' },
        fields: [
          {
            type: 'date',
            name: 'demoDate',
            label: 'Day',
            required: true,
            validation: { min: today() },
          },
          {
            type: 'select',
            name: 'demoTime',
            label: 'Time',
            options: o('09:00', '11:00', '15:00'),
          },
        ],
      },
      done('A sales rep will contact you shortly.'),
    ],
  },
  extensions: {
    ...restartOnly(ctx),
    hooks: {
      dedupe: (v) =>
        String(v.email).endsWith('@existing.com')
          ? { error: 'This contact is already in the CRM.' }
          : undefined,
    },
  },
});

const travel = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'travel-onboarding',
    steps: [
      {
        id: 'you',
        type: 'form',
        title: 'Welcome',
        fields: [
          {
            type: 'text',
            name: 'name',
            label: 'What should we call you?',
            required: true,
          },
          {
            type: 'combobox',
            name: 'home',
            label: 'Home airport',
            placeholder: 'Start typing…',
            options: o(
              'Madrid MAD',
              'Lisbon LIS',
              'Buenos Aires EZE',
              'Mexico City MEX',
              'Bogota BOG',
              'Montevideo MVD',
            ),
          },
        ],
      },
      {
        id: 'style',
        type: 'form',
        title: 'Your style',
        fields: [
          {
            type: 'radio',
            name: 'pace',
            label: 'Travel pace',
            required: true,
            options: o('Slow', 'Balanced', 'Packed'),
          },
          {
            type: 'multiselect',
            name: 'interests',
            label: 'Interests',
            options: o('Food', 'Hiking', 'Museums', 'Beaches', 'Nightlife'),
          },
          {
            type: 'range',
            name: 'budget',
            label: 'Daily budget (USD)',
            defaultValue: 120,
            step: 10,
            validation: { min: 30, max: 500 },
          },
        ],
      },
      {
        id: 'dates',
        type: 'form',
        title: 'First trip',
        fields: [
          {
            type: 'daterange',
            name: 'from',
            endName: 'to',
            label: 'Leaving',
            endLabel: 'Coming back',
            validation: { min: today() },
          },
        ],
      },
      {
        id: 'alerts',
        type: 'form',
        title: 'Alerts',
        fields: [
          { type: 'switch', name: 'deals', label: 'Tell me about fare drops' },
          {
            type: 'tel',
            name: 'phone',
            label: 'Phone for SMS alerts',
            visibleWhen: eq('deals', true),
          },
        ],
      },
      done('Your profile is ready. Let us find your first trip.'),
    ],
  },
  extensions: restartOnly(ctx),
});

const systemSetup = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'system-setup',
    steps: [
      {
        id: 'admin',
        type: 'form',
        title: 'Administrator',
        fields: [
          name,
          email,
          {
            type: 'password',
            name: 'password',
            label: 'Password',
            required: true,
            validation: { minLength: 12 },
          },
          {
            type: 'password',
            name: 'confirm',
            label: 'Repeat the password',
            required: true,
            validation: { sameAs: 'password' },
          },
        ],
      },
      {
        id: 'workspace',
        type: 'form',
        title: 'Workspace',
        ui: { columns: 2 },
        fields: [
          {
            type: 'text',
            name: 'org',
            label: 'Organization',
            required: true,
            ui: { span: 2 },
          },
          {
            type: 'select',
            name: 'timezone',
            label: 'Time zone',
            options: o('UTC', 'America/Bogota', 'Europe/Madrid'),
          },
          {
            type: 'select',
            name: 'language',
            label: 'Language',
            options: o('English', 'Spanish', 'Portuguese'),
          },
          {
            type: 'radio',
            name: 'theme',
            label: 'Theme',
            defaultValue: 'auto',
            options: o('Auto', 'Light', 'Dark'),
            ui: { span: 2 },
          },
        ],
      },
      {
        id: 'integrations',
        type: 'form',
        title: 'Integrations',
        fields: [
          {
            type: 'switch',
            name: 'smtp',
            label: 'Send email through my own SMTP server',
          },
          {
            type: 'text',
            name: 'smtpHost',
            label: 'SMTP host',
            required: true,
            visibleWhen: eq('smtp', true),
          },
          {
            type: 'number',
            name: 'smtpPort',
            label: 'SMTP port',
            defaultValue: 587,
            visibleWhen: eq('smtp', true),
            validation: { min: 1, max: 65535 },
          },
          { type: 'switch', name: 'backups', label: 'Nightly backups' },
          {
            type: 'select',
            name: 'retention',
            label: 'Keep backups for',
            visibleWhen: eq('backups', true),
            options: o('7 days', '30 days', '1 year'),
          },
        ],
      },
      { id: 'review', type: 'review', title: 'Review' },
      {
        id: 'provision',
        type: 'wait',
        title: 'Installing',
        strategy: 'provision',
        message: 'Creating the database and your workspace…',
      },
      done('The system is ready. Sign in with the administrator account.'),
    ],
  },
  extensions: { ...restartOnly(ctx), waits: { provision: settle(2500) } },
});

// ---------------------------------------------------------- Government & banking

const publicEntity = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'public-registry',
    steps: [
      {
        id: 'citizen',
        type: 'form',
        title: 'Applicant',
        ui: { columns: 2 },
        fields: [
          { ...name, ui: { span: 2 } },
          {
            type: 'text',
            name: 'nationalId',
            label: 'National ID',
            required: true,
            validation: { pattern: '^[0-9]{6,10}$' },
            description: '6 to 10 digits',
          },
          {
            type: 'date',
            name: 'birthdate',
            label: 'Date of birth',
            required: true,
            validation: { max: today() },
          },
          {
            type: 'text',
            name: 'address',
            label: 'Home address',
            required: true,
            ui: { span: 2 },
          },
        ],
      },
      {
        id: 'household',
        type: 'form',
        title: 'Household',
        fields: [
          {
            type: 'array',
            name: 'dependents',
            label: 'Dependents',
            addLabel: 'Add a dependent',
            validation: { maxItems: 5 },
            itemFields: [
              {
                type: 'text',
                name: 'fullName',
                label: 'Full name',
                required: true,
              },
              {
                type: 'select',
                name: 'relation',
                label: 'Relation',
                options: o('Child', 'Parent', 'Spouse', 'Other'),
              },
            ],
          },
        ],
      },
      {
        id: 'documents',
        type: 'form',
        title: 'Documents',
        fields: [
          {
            type: 'file',
            name: 'idScan',
            label: 'ID scan',
            required: true,
            accept: 'image/*,.pdf',
            validation: { maxSize: 5_000_000 },
          },
          {
            type: 'file',
            name: 'proofOfAddress',
            label: 'Proof of address (optional)',
            accept: '.pdf',
          },
        ],
      },
      terms('data protection notice'),
      { id: 'review', type: 'review', title: 'Review' },
      {
        id: 'processing',
        type: 'wait',
        title: 'Under review',
        strategy: 'office',
        message: 'An officer is reviewing your file…',
        cancellable: true,
        failTo: 'review',
      },
      {
        id: 'done',
        type: 'result',
        title: 'Registered',
        message: 'Your registration number is REG-2026-0042.',
        actions: [{ label: 'Start over', action: 'restart' }],
      },
    ],
  },
  extensions: { ...restartOnly(ctx), waits: { office: settle(3000) } },
});

/** Office → slot is a `dynamicSelect`; the confirmation cannot be revisited. */
const driving = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'license-renewal',
    steps: [
      {
        id: 'holder',
        type: 'form',
        title: 'License holder',
        fields: [
          name,
          {
            type: 'text',
            name: 'license',
            label: 'License number',
            required: true,
            validation: { pattern: '^[A-Z]{2}[0-9]{6}$' },
            description: 'Two letters and six digits, e.g. AB123456',
          },
          {
            type: 'date',
            name: 'expires',
            label: 'Expiry date',
            required: true,
          },
        ],
      },
      {
        id: 'medical',
        type: 'form',
        title: 'Medical certificate',
        fields: [
          {
            type: 'image',
            name: 'certificate',
            label: 'Photo of the certificate',
            required: true,
          },
          { type: 'switch', name: 'glasses', label: 'I need glasses to drive' },
        ],
      },
      {
        id: 'slot',
        type: 'form',
        title: 'Appointment',
        fields: [
          {
            type: 'dynamicSelect',
            name: 'office',
            label: 'Office',
            dependentName: 'time',
            options: o('Downtown', 'Airport', 'North station'),
            dependentOptions: {
              downtown: o('Mon 09:00', 'Mon 11:30', 'Tue 10:00'),
              airport: o('Wed 08:30', 'Thu 14:00'),
              'north-station': o('Fri 09:00', 'Fri 12:00', 'Sat 10:30'),
            },
          },
        ],
      },
      { id: 'confirm', type: 'review', title: 'Confirm', revisit: 'deny' },
      done(
        'Appointment booked. Bring your current license and the certificate.',
      ),
    ],
  },
  extensions: restartOnly(ctx),
});

const bank = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'bank-transfer',
    steps: [
      {
        id: 'transfer',
        type: 'form',
        title: 'Transfer',
        fields: [
          {
            type: 'select',
            name: 'from',
            label: 'From',
            required: true,
            options: o('Checking ····1234', 'Savings ····9876'),
          },
          {
            type: 'text',
            name: 'beneficiary',
            label: 'Beneficiary',
            required: true,
          },
          {
            type: 'text',
            name: 'iban',
            label: 'IBAN',
            required: true,
            validation: { pattern: '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' },
            description: 'e.g. ES9121000418450200051332',
          },
          {
            type: 'number',
            name: 'amount',
            label: 'Amount',
            required: true,
            prefix: '$',
            validation: { min: 1, max: 50000 },
            description: 'Over 1000 asks for a security code',
          },
          { type: 'text', name: 'concept', label: 'Concept' },
        ],
      },
      {
        id: 'security',
        type: 'form',
        title: 'Security code',
        visibleWhen: { field: 'amount', operator: 'gt', value: 1000 },
        hooks: { beforeNext: 'check-code' },
        fields: [
          {
            type: 'otp',
            name: 'code',
            label: 'Code sent to your phone (use 123456)',
            length: 6,
            required: true,
          },
        ],
      },
      { id: 'review', type: 'review', title: 'Review', revisit: 'deny' },
      {
        id: 'clearing',
        type: 'wait',
        title: 'Sending',
        strategy: 'clearing',
        message: 'Waiting for the bank network…',
        timeoutMs: 15_000,
        retry: { max: 2, backoffMs: 800 },
        cancellable: true,
        failTo: 'transfer',
      },
      done('Transfer sent. It usually lands within a minute.'),
    ],
  },
  extensions: {
    ...restartOnly(ctx),
    // The first attempt fails on purpose: watch the automatic retry.
    waits: { clearing: settle(1500, true) },
    hooks: {
      'check-code': (v) =>
        v.code === '123456' ? undefined : { error: 'Wrong code.' },
    },
  },
});

const semester = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'semester-enrollment',
    steps: [
      {
        id: 'student',
        type: 'form',
        title: 'Student',
        fields: [
          name,
          {
            type: 'text',
            name: 'studentId',
            label: 'Student ID',
            required: true,
            validation: { pattern: '^[0-9]{8}$' },
            description: '8 digits',
          },
          {
            type: 'dynamicSelect',
            name: 'faculty',
            label: 'Faculty',
            dependentName: 'career',
            options: o('Engineering', 'Sciences', 'Humanities'),
            dependentOptions: {
              engineering: o('Software', 'Civil', 'Electrical'),
              sciences: o('Physics', 'Biology'),
              humanities: o('History', 'Philosophy', 'Linguistics'),
            },
          },
        ],
      },
      {
        id: 'subjects',
        type: 'form',
        title: 'Subjects',
        hooks: { beforeNext: 'credits' },
        fields: [
          {
            type: 'check',
            name: 'subjects',
            label: 'Pick up to 5',
            required: true,
            options: o(
              'Calculus II',
              'Algorithms',
              'Databases',
              'Operating systems',
              'Statistics',
              'Ethics',
              'English',
              'Networks',
            ),
          },
        ],
      },
      {
        id: 'schedule',
        type: 'form',
        title: 'Schedule and aid',
        fields: [
          {
            type: 'radio',
            name: 'shift',
            label: 'Shift',
            required: true,
            options: o('Morning', 'Evening'),
          },
          {
            type: 'switch',
            name: 'scholarship',
            label: 'I have a scholarship',
          },
          {
            type: 'file',
            name: 'scholarshipLetter',
            label: 'Scholarship letter',
            required: true,
            visibleWhen: eq('scholarship', true),
          },
        ],
      },
      { id: 'review', type: 'review', title: 'Review' },
      done('Enrollment saved. Your timetable will be emailed.'),
    ],
  },
  extensions: {
    ...restartOnly(ctx),
    hooks: {
      credits: (v) =>
        Array.isArray(v.subjects) && v.subjects.length > 5
          ? { error: 'The credit limit is 5 subjects per semester.' }
          : undefined,
    },
  },
});

// ---------------------------------------------------------------------- Extras

const job = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'job-application',
    steps: [
      {
        id: 'candidate',
        type: 'form',
        title: 'About you',
        fields: [
          name,
          email,
          { type: 'url', name: 'profile', label: 'LinkedIn or portfolio' },
          {
            type: 'file',
            name: 'cv',
            label: 'CV (PDF)',
            required: true,
            accept: '.pdf',
          },
        ],
      },
      {
        id: 'experience',
        type: 'form',
        title: 'Experience',
        fields: [
          {
            type: 'array',
            name: 'jobs',
            label: 'Previous roles',
            addLabel: 'Add a role',
            validation: { minItems: 1, maxItems: 4 },
            itemFields: [
              {
                type: 'text',
                name: 'company',
                label: 'Company',
                required: true,
              },
              { type: 'text', name: 'role', label: 'Role', required: true },
              {
                type: 'number',
                name: 'years',
                label: 'Years',
                validation: { min: 0, max: 50 },
              },
            ],
          },
        ],
      },
      {
        id: 'questions',
        type: 'form',
        title: 'Last questions',
        fields: [
          {
            type: 'select',
            name: 'salary',
            label: 'Salary expectation',
            options: o('Under 40k', '40k-70k', 'Over 70k'),
          },
          {
            type: 'textarea',
            name: 'why',
            label: 'Why this role?',
            required: true,
          },
        ],
      },
      { id: 'review', type: 'review', title: 'Review' },
      done('Application received. We reply within five working days.'),
    ],
  },
  extensions: restartOnly(ctx),
});

const support = (ctx: Ctx): Built => ({
  scheme: {
    schemaVersion: 1,
    id: 'support-ticket',
    steps: [
      {
        id: 'ticket',
        type: 'form',
        title: 'Open a ticket',
        fields: [
          email,
          {
            type: 'radio',
            name: 'category',
            label: 'What is it about?',
            required: true,
            options: o('Billing', 'Bug', 'Question'),
          },
          {
            type: 'text',
            name: 'invoice',
            label: 'Invoice number',
            required: true,
            visibleWhen: eq('category', 'billing'),
          },
          {
            type: 'select',
            name: 'severity',
            label: 'Severity',
            visibleWhen: eq('category', 'bug'),
            options: o('Annoying', 'Blocks my work', 'Data loss'),
          },
          {
            type: 'image',
            name: 'screenshot',
            label: 'Screenshot',
            visibleWhen: eq('category', 'bug'),
          },
          {
            type: 'textarea',
            name: 'message',
            label: 'Describe it',
            required: true,
          },
        ],
      },
      done('Ticket #4821 opened. We will answer by email.'),
    ],
  },
  extensions: restartOnly(ctx),
});

export const examples: Example[] = [
  {
    id: 'signup',
    group: 'Registration',
    title: 'User signup',
    summary: 'The classic: account data, password confirmation and terms.',
    features: ['password sameAs', 'terms step', 'result actions'],
    build: signup,
  },
  {
    id: 'signup-event',
    group: 'Registration',
    title: 'Signup + event',
    summary: 'Register and pick a session, with an optional guest.',
    features: ['visibleWhen', 'check', 'review step'],
    build: signupEvent,
  },
  {
    id: 'signup-event-paid',
    group: 'Payments',
    title: 'Signup + paid event',
    summary:
      'Free tickets skip payment. Paid ones go through any configured provider (or the mock) and are confirmed by the backend.',
    features: ['payment step', 'wait step', 'conditional steps'],
    payments: true,
    build: signupEventPaid,
  },
  {
    id: 'survey',
    group: 'Product',
    title: 'Survey',
    summary: 'The follow-up questions depend on the score.',
    features: ['rating', 'range', 'conditional steps'],
    build: survey,
  },
  {
    id: 'crm-lead',
    group: 'Product',
    title: 'CRM lead qualification',
    summary:
      'Sales intake that routes small, mid-size and enterprise leads differently.',
    features: ['next edges', 'beforeNext hook', 'branching'],
    build: crm,
  },
  {
    id: 'travel-onboarding',
    group: 'Product',
    title: 'Travel app onboarding',
    summary: 'Preferences, first trip dates and alerts.',
    features: ['combobox', 'multiselect', 'daterange'],
    build: travel,
  },
  {
    id: 'system-setup',
    group: 'Product',
    title: 'Initial system setup',
    summary: 'First-run wizard: admin, workspace, integrations, provisioning.',
    features: ['2-column layout', 'review step', 'wait step'],
    build: systemSetup,
  },
  {
    id: 'public-registry',
    group: 'Government & banking',
    title: 'Public registry',
    summary:
      'Citizen registration with dependents, documents and an officer review.',
    features: ['array', 'file upload', 'cancellable wait'],
    build: publicEntity,
  },
  {
    id: 'license-renewal',
    group: 'Government & banking',
    title: 'Driver license appointment',
    summary:
      'Renewal with a medical certificate and a slot that depends on the office.',
    features: ['dynamicSelect', 'image', 'revisit: deny'],
    build: driving,
  },
  {
    id: 'bank-transfer',
    group: 'Government & banking',
    title: 'Bank transfer',
    summary:
      'Large amounts ask for a code; the network fails once and retries by itself.',
    features: ['validation', 'otp', 'wait retry + timeout'],
    build: bank,
  },
  {
    id: 'semester-enrollment',
    group: 'Government & banking',
    title: 'Semester enrollment',
    summary:
      'Faculty → career, subject selection with a credit limit, scholarship proof.',
    features: ['dynamicSelect', 'beforeNext block', 'conditional file'],
    build: semester,
  },
  {
    id: 'job-application',
    group: 'Product',
    title: 'Job application',
    summary: 'CV upload and repeatable work experience.',
    features: ['array minItems', 'file', 'review step'],
    build: job,
  },
  {
    id: 'support-ticket',
    group: 'Product',
    title: 'Support ticket',
    summary: 'One step whose fields change with the category.',
    features: ['visibleWhen on fields', 'image'],
    build: support,
  },
];
