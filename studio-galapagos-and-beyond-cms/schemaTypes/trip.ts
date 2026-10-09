import {defineField, defineArrayMember, defineType} from 'sanity'
import {CaseIcon} from '@sanity/icons'
import {
  bannerField,
  galleryGroupField,
  highlightsField,
  includeField,
  excludeField,
  faqField,
  addOnsField,
} from './shared/commonFields'

/**
 * Unified type for everything bookable: day tours, multi-day land packages,
 * all-inclusive packages, and cruise itineraries (A/B/C per ship).
 *
 * One type instead of several — a single search/filter page can query
 * `trip` alone across every kind. `kind` toggles which extra fields apply
 * (see each field's `hidden` callback). Ship/stay are REFERENCES, not
 * copies, so ship or hotel info stays in sync everywhere it's used.
 */
export const trip = defineType({
  name: 'trip',
  title: 'Tours',
  type: 'document',
  icon: CaseIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'media', title: 'Media'},
    {name: 'filters', title: 'Filters & taxonomy'},
    {name: 'logistics', title: 'Logistics'},
  ],
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', group: 'content', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      group: 'content',
      options: {
        list: [
          {title: 'Day Tour', value: 'day-tour'},
          {title: 'Multi-Day Land Tour', value: 'multi-day'},
          {title: 'All-Inclusive Package', value: 'all-inclusive'},
          {title: 'Cruise Itinerary', value: 'cruise-itinerary'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price (from, USD per person)',
      type: 'number',
      group: 'content',
      description:
        'Base price. It applies on any start date that is NOT inside one of the seasonal prices below.',
    }),
    defineField({
      name: 'childPrice',
      title: 'Child price (USD per person)',
      type: 'number',
      group: 'content',
      description: 'Leave blank if children pay the same as adults',
      hidden: ({document}) => document?.kind === 'cruise-itinerary',
    }),
    defineField({
      name: 'seasonalPrices',
      title: 'Seasonal prices',
      type: 'array',
      group: 'content',
      description:
        'Optional. A different price for a date range. The price is chosen by the traveler’s START date (both ends of the range included). Dates outside every range use the base price above. Ranges must not overlap.',
      hidden: ({document}) => document?.kind === 'cruise-itinerary',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'seasonalPrice',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Shown to travelers, e.g. "High season". Optional.',
            }),
            defineField({
              name: 'startDate',
              title: 'First day',
              type: 'date',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'endDate',
              title: 'Last day (included)',
              type: 'date',
              validation: (rule) =>
                rule.required().custom((value, context) => {
                  const start = (context.parent as {startDate?: string} | undefined)?.startDate
                  if (value && start && value < start) return 'Must be on or after the first day'
                  return true
                }),
            }),
            defineField({
              name: 'price',
              title: 'Price (USD per person)',
              type: 'number',
              validation: (rule) => rule.required().greaterThan(0),
            }),
            defineField({
              name: 'childPrice',
              title: 'Child price (USD per person)',
              type: 'number',
              description:
                'Leave blank if children pay the same as adults in this season (the base child price is NOT used).',
              validation: (rule) => rule.min(0),
            }),
          ],
          preview: {
            select: {label: 'label', start: 'startDate', end: 'endDate', price: 'price'},
            prepare: ({label, start, end, price}) => ({
              title: `${label || 'Season'} — $${price ?? '?'}`,
              subtitle: `${start ?? '?'} → ${end ?? '?'}`,
            }),
          },
        }),
      ],
      validation: (rule) =>
        rule.custom((seasons) => {
          const list = ((seasons as Array<{label?: string; startDate?: string; endDate?: string}>) ?? [])
            .filter((s) => s?.startDate && s?.endDate)
            .sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1))
          for (let i = 1; i < list.length; i++) {
            if (list[i].startDate! <= list[i - 1].endDate!) {
              const a = list[i - 1].label || list[i - 1].startDate
              const b = list[i].label || list[i].startDate
              return `Seasons overlap: "${a}" and "${b}". Each date can only belong to one season.`
            }
          }
          return true
        }),
    }),
    defineField({name: 'durationDays', title: 'Duration (days)', type: 'number', group: 'content', validation: (rule) => rule.required().min(1)}),
    defineField({name: 'description', title: 'Description', type: 'text', group: 'content', rows: 6}),
    {...highlightsField, group: 'content'},
    {...includeField, group: 'content'},
    {...excludeField, group: 'content'},
    {
      ...addOnsField,
      group: 'content',
      hidden: ({document}) => document?.kind === 'cruise-itinerary',
    },
    {...faqField, group: 'content'},

    // --- Media ---
    {...bannerField, group: 'media'},
    {...galleryGroupField, group: 'media'},

    // --- Filters & taxonomy ---
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'tourCategory'}],
      group: 'filters',
      description: 'Traveller-facing category (Day Tours, Multi-Day, Diving...) — drives /tours/ filters, nav and its own hub page.',
      hidden: ({document}) => document?.kind === 'cruise-itinerary',
      validation: (rule) =>
        rule.custom((value, context) => {
          const doc = context.document as {kind?: string} | undefined
          if (doc?.kind === 'cruise-itinerary') return true
          return value ? true : 'Required for day tours, multi-day and all-inclusive packages'
        }),
    }),
    defineField({
      name: 'destinations',
      title: 'Destination(s)',
      type: 'array',
      group: 'filters',
      description: 'Usually one — combo packages (e.g. Galápagos + Machu Picchu) can have more than one',
      of: [defineArrayMember({type: 'reference', to: [{type: 'destination'}]})],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'activityTags',
      title: 'Activities',
      type: 'array',
      group: 'filters',
      of: [defineArrayMember({type: 'reference', to: [{type: 'activityTag'}]})],
    }),
    defineField({
      name: 'islandsVisited',
      title: 'Islands / sites visited',
      type: 'array',
      group: 'filters',
      description: 'Quick-filter summary — the day-by-day itinerary below has the full detail',
      of: [defineArrayMember({type: 'reference', to: [{type: 'island'}]})],
    }),
    defineField({
      name: 'activityLevel',
      title: 'Activity level',
      type: 'string',
      group: 'filters',
      options: {
        list: [
          {title: 'Easy', value: 'easy'},
          {title: 'Moderate', value: 'moderate'},
          {title: 'Difficult', value: 'difficult'},
        ],
        layout: 'radio',
      },
    }),

    // --- Cruise-itinerary-only ---
    defineField({
      name: 'ship',
      title: 'Ship',
      type: 'reference',
      to: [{type: 'ship'}],
      group: 'logistics',
      hidden: ({document}) => document?.kind !== 'cruise-itinerary',
    }),
    defineField({
      name: 'apiItineraryCode',
      title: 'Live API itinerary code',
      type: 'string',
      group: 'logistics',
      description: 'Matches the itinerary letter from the live availability API (A, B, C...)',
      hidden: ({document}) => document?.kind !== 'cruise-itinerary',
    }),

    // --- Land itinerary (multi-day / all-inclusive) ---
    defineField({
      name: 'stay',
      title: 'Hotel / stay',
      type: 'reference',
      to: [{type: 'stay'}],
      group: 'logistics',
      description: 'Optional — the hotel used for overnight stays on this land itinerary',
      hidden: ({document}) => !['multi-day', 'all-inclusive'].includes(document?.kind as string),
    }),

    // --- Multi-day itinerary detail (land or cruise) ---
    defineField({
      name: 'itineraryDays',
      title: 'Day-by-day itinerary',
      type: 'array',
      group: 'logistics',
      of: [defineArrayMember({type: 'itineraryDay'})],
      hidden: ({document}) => document?.kind === 'day-tour',
    }),

    // --- Day-tour-only ---
    defineField({
      name: 'operatingDays',
      title: 'Operates on',
      type: 'array',
      group: 'logistics',
      of: [defineArrayMember({type: 'string'})],
      options: {
        list: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
      hidden: ({document}) => document?.kind !== 'day-tour',
    }),
    defineField({
      name: 'pickupTime',
      title: 'Pickup time',
      type: 'string',
      group: 'logistics',
      hidden: ({document}) => document?.kind !== 'day-tour',
    }),
    defineField({
      name: 'returnTime',
      title: 'Return time',
      type: 'string',
      group: 'logistics',
      hidden: ({document}) => document?.kind !== 'day-tour',
    }),
    defineField({
      name: 'pickupLocation',
      title: 'Pickup / return location',
      type: 'string',
      group: 'logistics',
      description: 'e.g. Hotel',
      hidden: ({document}) => document?.kind !== 'day-tour',
    }),
    defineField({
      name: 'daySchedule',
      title: 'Day schedule',
      type: 'array',
      group: 'logistics',
      description: 'Time-by-time schedule for a single-day tour (e.g. diving day trips)',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'time', title: 'Time', type: 'string'}),
            defineField({name: 'activity', title: 'Activity', type: 'text', rows: 2}),
          ],
          preview: {select: {title: 'time', subtitle: 'activity'}},
        }),
      ],
      hidden: ({document}) => document?.kind !== 'day-tour',
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'kind', media: 'banner'},
  },
})
