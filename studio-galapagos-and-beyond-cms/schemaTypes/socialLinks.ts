import {defineField, defineType} from 'sanity'
import {CommentIcon} from '@sanity/icons'

/**
 * Singleton — only one document of this type should exist. Not enforced by
 * Sanity itself, just keep it to one in the Studio.
 */
export const socialLinks = defineType({
  name: 'socialLinks',
  title: 'Social & Contact Links',
  type: 'document',
  icon: CommentIcon,
  fields: [
    defineField({
      name: 'whatsappNumber',
      title: 'WhatsApp number',
      type: 'string',
      description: 'International format, digits only, no +/spaces — e.g. 593999999999',
      validation: (rule) => rule.regex(/^\d{8,15}$/, {name: 'digits only, with country code'}),
    }),
    defineField({
      name: 'whatsappDefaultMessage',
      title: 'WhatsApp default message',
      type: 'string',
      description: 'Prefilled message when a page link doesn\'t set its own',
    }),
    defineField({
      name: 'email',
      title: 'Email empresarial',
      type: 'string',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'personalEmail',
      title: 'Email personal',
      type: 'string',
      validation: (rule) => rule.email(),
    }),
    defineField({name: 'instagramUrl', title: 'Instagram URL', type: 'url'}),
    defineField({name: 'facebookUrl', title: 'Facebook URL', type: 'url'}),
    defineField({name: 'tripadvisorUrl', title: 'TripAdvisor URL', type: 'url'}),
    defineField({name: 'airbnbUrl', title: 'Airbnb URL', type: 'url'}),
    defineField({name: 'bookingUrl', title: 'Booking.com URL', type: 'url'}),
  ],
  preview: {
    prepare: () => ({title: 'Social & Contact Links'}),
  },
})
