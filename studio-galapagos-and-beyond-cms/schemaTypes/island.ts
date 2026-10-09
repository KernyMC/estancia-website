import {defineField, defineType} from 'sanity'
import {PinIcon} from '@sanity/icons'

/**
 * Reusable taxonomy for islands / visitor sites, scoped to a destination so
 * Galápagos sites and future Peru sites never mix in the same filter list.
 */
export const island = defineType({
  name: 'island',
  title: 'Island / Visitor Site',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'e.g. Santa Cruz, Española, Bartolomé',
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
      name: 'destination',
      title: 'Destination',
      type: 'reference',
      to: [{type: 'destination'}],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'destination.name'},
  },
})
