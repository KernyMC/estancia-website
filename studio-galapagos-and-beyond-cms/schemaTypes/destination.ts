import {defineField, defineType} from 'sanity'
import {EarthGlobeIcon} from '@sanity/icons'

export const destination = defineType({
  name: 'destination',
  title: 'Destination',
  type: 'document',
  icon: EarthGlobeIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'e.g. Galápagos Islands, Peru',
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
      name: 'country',
      title: 'Country',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'banner',
      title: 'Banner image',
      type: 'image',
      options: {hotspot: true},
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'country'},
  },
})
