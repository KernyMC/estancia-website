import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons'

/**
 * Flat taxonomy for activity/experience type — shared across all
 * destinations (Snorkeling, Hiking etc. apply everywhere), used for
 * filtering on the trips search page.
 */
export const activityTag = defineType({
  name: 'activityTag',
  title: 'Activity Tag',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'e.g. Snorkeling, Diving, Hiking, Wildlife, Kayaking, Birdwatching',
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
      name: 'image',
      title: 'Filter chip image',
      type: 'image',
      description: 'Shown on the activity filter chip on /tours/ — pick a photo representative of this activity.',
      options: {hotspot: true},
    }),
  ],
  preview: {
    select: {title: 'name', media: 'image'},
  },
})
