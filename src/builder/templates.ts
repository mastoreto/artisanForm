import type { ArtisanSchemaV1 } from '../schema/contract/define';

/** A starting point offered in the builder's gallery. */
export interface BuilderTemplate {
  id: string;
  title: string;
  description: string;
  schema: ArtisanSchemaV1;
}

const done = (message: string) =>
  ({ id: 'done', type: 'result', title: 'Done', message }) as const;

/**
 * Starter forms, as plain JSON (nothing here needs code registered by the
 * app). Pass your own `templates` to the builder to replace them.
 */
export const defaultTemplates: BuilderTemplate[] = [
  {
    id: 'blank',
    title: 'Blank form',
    description: 'One empty step.',
    schema: {
      schemaVersion: 1,
      id: 'new-form',
      title: 'New form',
      steps: [{ id: 'form', type: 'form', title: 'Step 1', fields: [] }],
    },
  },
  {
    id: 'contact',
    title: 'Contact',
    description: 'Name, email and a message.',
    schema: {
      schemaVersion: 1,
      id: 'contact',
      title: 'Contact us',
      steps: [
        {
          id: 'message',
          type: 'form',
          title: 'Your message',
          fields: [
            {
              type: 'text',
              name: 'fullName',
              label: 'Full name',
              required: true,
            },
            { type: 'email', name: 'email', label: 'Email', required: true },
            {
              type: 'textarea',
              name: 'message',
              label: 'Message',
              required: true,
              validation: { maxLength: 1000 },
            },
          ],
        },
        done('Thanks, we will write back soon.'),
      ],
    },
  },
  {
    id: 'registration',
    title: 'Event registration',
    description: 'Attendee, companions and terms.',
    schema: {
      schemaVersion: 1,
      id: 'event-registration',
      title: 'Register for the event',
      steps: [
        {
          id: 'attendee',
          type: 'form',
          title: 'Attendee',
          fields: [
            {
              type: 'text',
              name: 'fullName',
              label: 'Full name',
              required: true,
            },
            { type: 'email', name: 'email', label: 'Email', required: true },
            { type: 'tel', name: 'phone', label: 'Phone' },
            {
              type: 'text',
              name: 'documentNumber',
              label: 'Document number',
              sensitive: true,
            },
            {
              type: 'select',
              name: 'ticket',
              label: 'Ticket',
              required: true,
              options: [
                { value: 'general', label: 'General' },
                { value: 'vip', label: 'VIP' },
              ],
            },
            {
              type: 'switch',
              name: 'bringsCompanions',
              label: 'I bring companions',
            },
            {
              type: 'array',
              name: 'companions',
              label: 'Companions',
              addLabel: 'Add companion',
              visibleWhen: {
                field: 'bringsCompanions',
                operator: 'eq',
                value: true,
              },
              itemFields: [
                { type: 'text', name: 'companionName', label: 'Name' },
              ],
            },
          ],
        },
        {
          id: 'terms',
          type: 'terms',
          title: 'Terms',
          content: 'Write the event terms here.',
          accept: { label: 'I accept the terms' },
        },
        done('You are registered. See you there!'),
      ],
    },
  },
  {
    id: 'survey',
    title: 'Satisfaction survey',
    description: 'A rating, a choice and a comment.',
    schema: {
      schemaVersion: 1,
      id: 'survey',
      title: 'How did we do?',
      steps: [
        {
          id: 'survey',
          type: 'form',
          title: 'Your opinion',
          fields: [
            {
              type: 'rating',
              name: 'rating',
              label: 'Overall rating',
              required: true,
              length: 5,
            },
            {
              type: 'radio',
              name: 'recommend',
              label: 'Would you recommend us?',
              options: [
                { value: 'yes', label: 'Yes' },
                { value: 'maybe', label: 'Maybe' },
                { value: 'no', label: 'No' },
              ],
            },
            {
              type: 'textarea',
              name: 'comment',
              label: 'Anything to add?',
              visibleWhen: { field: 'recommend', operator: 'eq', value: 'no' },
            },
          ],
        },
        done('Thank you for your feedback.'),
      ],
    },
  },
  {
    id: 'job',
    title: 'Job application',
    description: 'Two steps with a CV upload.',
    schema: {
      schemaVersion: 1,
      id: 'job-application',
      title: 'Apply',
      steps: [
        {
          id: 'about',
          type: 'form',
          title: 'About you',
          fields: [
            {
              type: 'text',
              name: 'fullName',
              label: 'Full name',
              required: true,
            },
            { type: 'email', name: 'email', label: 'Email', required: true },
            { type: 'url', name: 'portfolio', label: 'Portfolio' },
          ],
        },
        {
          id: 'experience',
          type: 'form',
          title: 'Experience',
          fields: [
            {
              type: 'number',
              name: 'years',
              label: 'Years of experience',
              validation: { min: 0, max: 60 },
            },
            {
              type: 'file',
              name: 'cv',
              label: 'CV',
              required: true,
              accept: 'application/pdf',
            },
          ],
        },
        { id: 'review', type: 'review', title: 'Review' },
        done('Application received.'),
      ],
    },
  },
];
