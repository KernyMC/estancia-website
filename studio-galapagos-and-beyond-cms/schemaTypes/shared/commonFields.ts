import {defineField, defineArrayMember} from 'sanity'

/** The single banner/hero image shown at the top of a ship, stay, or trip page. */
export const bannerField = defineField({
  name: 'banner',
  title: 'Banner image',
  type: 'image',
  description: 'Hero image shown at the top of the page',
  options: {hotspot: true},
  fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
})

/** A labeled group of images — e.g. ship gallery tabs ("The Yacht", "Cabins"). */
export const galleryGroupField = defineField({
  name: 'gallery',
  title: 'Gallery',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'object',
      name: 'galleryGroup',
      fields: [
        defineField({name: 'label', title: 'Label', type: 'string', description: 'e.g. The Yacht, Cabins, Gallery'}),
        defineField({
          name: 'images',
          title: 'Images',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'image',
              options: {hotspot: true},
              fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
            }),
          ],
        }),
      ],
      preview: {
        select: {title: 'label', media: 'images.0'},
        prepare: ({title, media}) => ({title, media}),
      },
    }),
  ],
})

export const highlightsField = defineField({
  name: 'highlights',
  title: 'Highlights',
  type: 'array',
  of: [defineArrayMember({type: 'string'})],
})

export const includeField = defineField({
  name: 'include',
  title: 'Included',
  type: 'array',
  of: [defineArrayMember({type: 'string'})],
})

export const amenitiesField = defineField({
  name: 'amenities',
  title: 'Amenities',
  type: 'array',
  description: 'e.g. Free WiFi, Pool, Kitchen, Air conditioning',
  of: [defineArrayMember({type: 'string'})],
})

export const excludeField = defineField({
  name: 'exclude',
  title: 'Not included',
  type: 'array',
  of: [defineArrayMember({type: 'string'})],
})

/**
 * Paid activity variants for a trip (e.g. snorkeling included vs a scuba
 * upgrade) — one trip offers alternatives at different prices instead of
 * being duplicated as a second document per variant.
 */
export const addOnsField = defineField({
  name: 'addOns',
  title: 'Activity add-ons',
  description: 'Optional paid alternatives to the default marine activity (e.g. a diving upgrade)',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'object',
      name: 'tripAddOn',
      fields: [
        defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
        defineField({
          name: 'slug',
          title: 'Slug',
          type: 'slug',
          options: {source: 'name', maxLength: 96},
          validation: (rule) => rule.required(),
        }),
        defineField({name: 'description', title: 'Description', type: 'text', rows: 2}),
        defineField({
          name: 'replaces',
          title: 'Replaces (default activity)',
          type: 'string',
          description: 'Name of the standard activity this add-on swaps out (e.g. "Snorkeling") — shown next to the "Included" choice in the booking form so guests know what they get by default',
        }),
        defineField({
          name: 'priceDelta',
          title: 'Price delta (USD per person)',
          type: 'number',
          description: 'Added on top of the base price when a guest picks this option',
          validation: (rule) => rule.required(),
        }),
      ],
      preview: {
        select: {title: 'name', subtitle: 'priceDelta'},
        prepare: ({title, subtitle}) => ({title, subtitle: subtitle ? `+$${subtitle}/person` : undefined}),
      },
    }),
  ],
})

/** Optional SEO overrides — falls back to auto-generated title/description when empty. */
export const seoField = defineField({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  description: 'Optional — leave blank to auto-generate from name/description',
  fields: [
    defineField({name: 'title', title: 'Meta title', type: 'string'}),
    defineField({name: 'description', title: 'Meta description', type: 'text', rows: 3}),
    defineField({name: 'focusKeyword', title: 'Focus keyword', type: 'string'}),
  ],
})

export const faqField = defineField({
  name: 'faq',
  title: 'FAQ',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'object',
      name: 'faqItem',
      fields: [
        defineField({name: 'question', title: 'Question', type: 'string', validation: (rule) => rule.required()}),
        defineField({name: 'answer', title: 'Answer', type: 'text', validation: (rule) => rule.required()}),
      ],
      preview: {select: {title: 'question'}},
    }),
  ],
})
