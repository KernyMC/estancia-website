import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons'
import {seoField} from './shared/commonFields'

/**
 * Flat taxonomy for tour category (Day Tours, Multi-Day, Diving...).
 * Referenced by `trip.category` — editable from Studio, no code change
 * needed to add a new category. Separate from `trip.kind`, which stays a
 * fixed internal type discriminator (day-tour/multi-day/all-inclusive/
 * cruise-itinerary) controlling which fields apply — this is purely the
 * traveller-facing label/filter/nav grouping. `order` controls display
 * order in nav/filters.
 */
export const tourCategory = defineType({
  name: 'tourCategory',
  title: 'Tour Category',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'e.g. Day Tours, Multi-Day, Diving',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Used in the URL, e.g. /tours/day-tours/',
      options: {source: 'name', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      description: 'Lower numbers show first in navigation and filters',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heading',
      title: 'Hub page heading (H1)',
      type: 'string',
      description: 'Shown at the top of /tours/[category]/',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Hub page intro copy',
      type: 'text',
      rows: 3,
      description: 'Shown under the heading on /tours/[category]/, and used as the meta description unless overridden below',
      validation: (rule) => rule.required(),
    }),
    seoField,
  ],
  orderings: [
    {name: 'orderAsc', title: 'Display order', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'name', subtitle: 'order'},
    prepare: ({title, subtitle}) => ({title, subtitle: `Order: ${subtitle}`}),
  },
})
