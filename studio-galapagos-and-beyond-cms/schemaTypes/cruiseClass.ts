import {defineField, defineType} from 'sanity'
import {StarIcon} from '@sanity/icons'

/**
 * Flat taxonomy for cruise class (Luxury, First Class, Tourist Superior...).
 * Referenced by `ship.category` — editable from Studio, no code change
 * needed to add a new class. `order` controls display order in nav/filters
 * (alphabetical doesn't match the intended Luxury -> First Class -> Tourist
 * Superior hierarchy).
 */
export const cruiseClass = defineType({
  name: 'cruiseClass',
  title: 'Cruise Class',
  type: 'document',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'e.g. Luxury, First Class, Tourist Superior',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
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
  ],
  orderings: [
    {name: 'orderAsc', title: 'Display order', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'name', subtitle: 'order'},
    prepare: ({title, subtitle}) => ({title, subtitle: `Order: ${subtitle}`}),
  },
})
