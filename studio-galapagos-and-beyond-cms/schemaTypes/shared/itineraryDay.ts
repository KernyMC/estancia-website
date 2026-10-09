import {defineField, defineType} from 'sanity'

/**
 * One day of a multi-day itinerary (cruise or land). Embedded, not
 * referenced — a day only makes sense inside its parent trip's itinerary.
 */
export const itineraryDay = defineType({
  name: 'itineraryDay',
  title: 'Itinerary Day',
  type: 'object',
  fields: [
    defineField({name: 'dayLabel', title: 'Day label', type: 'string', description: 'e.g. Day 1, Tuesday'}),
    defineField({
      name: 'island',
      title: 'Island / site visited',
      type: 'reference',
      to: [{type: 'island'}],
    }),
    defineField({name: 'am', title: 'Morning', type: 'text', rows: 2}),
    defineField({name: 'pm', title: 'Afternoon', type: 'text', rows: 2}),
  ],
  preview: {
    select: {title: 'dayLabel', subtitle: 'island.name'},
  },
})
