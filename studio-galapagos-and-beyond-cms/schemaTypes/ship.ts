import {defineField, defineArrayMember, defineType} from 'sanity'
import {CubeIcon} from '@sanity/icons'
import {bannerField, galleryGroupField, highlightsField, includeField, excludeField, faqField, seoField} from './shared/commonFields'

export const ship = defineType({
  name: 'ship',
  title: 'Ship',
  type: 'document',
  icon: CubeIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'media', title: 'Media'},
    {name: 'booking', title: 'Booking'},
  ],
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', group: 'content', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'name', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'destination',
      title: 'Destination',
      type: 'reference',
      to: [{type: 'destination'}],
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured on homepage',
      type: 'boolean',
      group: 'content',
      description: 'Show this ship in the homepage "Departing soon" carousel, regardless of departure date.',
      initialValue: false,
    }),
    defineField({
      name: 'boatType',
      title: 'Boat type',
      type: 'string',
      group: 'content',
      description: 'e.g. Catamaran, Yacht, Liveaboard',
    }),
    defineField({
      name: 'category',
      title: 'Class',
      type: 'reference',
      to: [{type: 'cruiseClass'}],
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'capacity', title: 'Guest capacity', type: 'number', group: 'content'}),
    defineField({name: 'cabinsCount', title: 'Number of cabins', type: 'number', group: 'content'}),
    defineField({name: 'crewCount', title: 'Crew members', type: 'number', group: 'content'}),
    defineField({name: 'guidesCount', title: 'Naturalist guides', type: 'number', group: 'content'}),
    defineField({name: 'description', title: 'Description', type: 'text', group: 'content', rows: 6}),
    {...highlightsField, group: 'content'},
    {...includeField, group: 'content'},
    {...excludeField, group: 'content'},
    {...faqField, group: 'content'},
    {...bannerField, group: 'media'},
    {...galleryGroupField, group: 'media'},
    defineField({
      name: 'activities',
      title: 'Onboard activities',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'activity',
          fields: [
            defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'image', title: 'Image', type: 'image', options: {hotspot: true}}),
          ],
          preview: {select: {title: 'name', media: 'image'}},
        }),
      ],
    }),
    defineField({
      name: 'activityTags',
      title: 'Experience tags',
      type: 'array',
      group: 'content',
      description:
        'Traveller-facing experience filters for the cruises hub (e.g. Snorkeling, Diving, Kayaking). Drives audit #8 experience filters once the frontend reads ships from Sanity.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'activityTag'}]})],
    }),
    defineField({
      name: 'hasLiveAvailability',
      title: 'Has live availability (via API)',
      type: 'boolean',
      group: 'booking',
      description:
        'Off for cruises without a live-availability API feed — the site shows a simple "request a quote" card instead of the live pricing/dates table.',
      initialValue: true,
    }),
    defineField({
      name: 'indicativePrice',
      title: 'Indicative price (USD per person, optional)',
      type: 'number',
      group: 'booking',
      description:
        'Shown as "from $X / person" when this cruise has no live availability. Leave blank to show "Contact us for pricing" instead.',
      hidden: ({document}) => document?.hasLiveAvailability !== false,
    }),
    defineField({
      name: 'apiShipId',
      title: 'Live availability API ship ID',
      type: 'number',
      group: 'booking',
      description: 'Numeric ID used to match this ship against the external availability API',
      hidden: ({document}) => document?.hasLiveAvailability === false,
    }),
    defineField({
      name: 'apiName',
      title: 'Live availability API ship name',
      type: 'string',
      group: 'booking',
      description: 'Exact name as it appears in the external API (e.g. "M/C Galaxy Sirius") — used for matching, not display',
      hidden: ({document}) => document?.hasLiveAvailability === false,
    }),
    {...seoField, group: 'content'},
  ],
  preview: {
    select: {title: 'name', subtitle: 'category.name', media: 'banner'},
  },
})
