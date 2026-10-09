import {defineArrayMember, defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons'

/**
 * One document per legal page (privacy / terms / cookies), distinguished by
 * `page`. Not a strict singleton-per-type like socialLinks, but there should
 * only ever be one document per `page` value — keep it that way in Studio.
 */
export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal Page',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'page',
      title: 'Page',
      type: 'string',
      options: {
        list: [
          {title: 'Privacy Policy', value: 'privacy'},
          {title: 'Terms & Conditions', value: 'terms'},
          {title: 'Cookie Policy', value: 'cookies'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Browser tab title',
      type: 'string',
      description: 'e.g. "Privacy Policy | Galápagos & Beyond"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Meta description',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heading',
      title: 'Page heading (H1)',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      type: 'string',
      description: 'Free text as shown to visitors, e.g. "July 2026"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Section heading', value: 'h2'},
          ],
          lists: [{title: 'Bullet', value: 'bullet'}],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({name: 'href', title: 'URL', type: 'string', validation: (rule) => rule.required()}),
                ],
              },
            ],
          },
        }),
      ],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'heading', subtitle: 'page'},
    prepare: ({title, subtitle}) => ({title, subtitle}),
  },
})
