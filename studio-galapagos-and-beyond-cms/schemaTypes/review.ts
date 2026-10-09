import {defineField, defineType} from 'sanity'
import {StarIcon} from '@sanity/icons'

export const review = defineType({
  name: 'review',
  title: 'Review',
  type: 'document',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'reviewType',
      title: 'Review about',
      type: 'string',
      description: 'Is this review about the agency overall, or about a specific stay?',
      options: {
        list: [
          {title: 'Agency (general)', value: 'agency'},
          {title: 'A specific stay', value: 'stay'},
        ],
        layout: 'radio',
      },
      initialValue: 'agency',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'stay',
      title: 'Stay',
      type: 'reference',
      to: [{type: 'stay'}],
      description: 'Which stay this review is about.',
      // Only shown/relevant when the review is about a specific stay.
      hidden: ({parent}) => parent?.reviewType !== 'stay',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {reviewType?: string} | undefined
          if (parent?.reviewType === 'stay' && !value) {
            return 'Select the stay this review is about'
          }
          return true
        }),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description:
        'Where the review comes from. The matching logo is rendered on the website — add new sources here as you expand.',
      options: {
        list: [
          {title: 'Airbnb', value: 'airbnb'},
          {title: 'TripAdvisor', value: 'tripadvisor'},
          {title: 'Booking.com', value: 'booking'},
        ],
        layout: 'radio',
      },
      initialValue: 'airbnb',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Guest name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'guestPhoto',
      title: 'Guest photo',
      type: 'image',
      description:
        'Optional. If left empty, the website shows a circle with the first letter of the guest name.',
      options: {hotspot: true},
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'rating',
      title: 'Rating (1-5)',
      type: 'number',
      validation: (rule) => rule.required().min(1).max(5),
    }),
    defineField({
      name: 'text',
      title: 'Review text',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'link',
      title: 'Original review link',
      type: 'url',
      description: 'Link back to the review on the source platform.',
    }),
  ],
  preview: {
    select: {
      title: 'author',
      stayName: 'stay.name',
      reviewType: 'reviewType',
      source: 'source',
      media: 'guestPhoto',
    },
    prepare({title, stayName, reviewType, source, media}) {
      const sourceLabel = source ? source.charAt(0).toUpperCase() + source.slice(1) : ''
      const about = reviewType === 'stay' ? stayName || 'Stay' : 'Agency'
      return {
        title,
        subtitle: [sourceLabel, about].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
