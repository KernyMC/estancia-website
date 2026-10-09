import {defineField, defineArrayMember, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons'
import {bannerField, galleryGroupField, highlightsField, amenitiesField, faqField} from './shared/commonFields'

const roomField = defineField({
  name: 'rooms',
  title: 'Rooms',
  type: 'array',
  description: 'Individual rooms/units guests can be shown — e.g. the 5 rooms of the Santa Cruz aparthotel',
  of: [
    defineArrayMember({
      type: 'object',
      name: 'room',
      fields: [
        defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 4,
        }),
        defineField({name: 'capacity', title: 'Guest capacity', type: 'number'}),
        defineField({name: 'beds', title: 'Beds', type: 'string', description: 'e.g. 1 queen bed, 2 twin beds'}),
        {...amenitiesField, name: 'amenities', title: 'Room amenities'},
        defineField({
          name: 'gallery',
          title: 'Photos',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'image',
              options: {hotspot: true},
              fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
            }),
          ],
        }),
      ],
      preview: {
        select: {title: 'name', subtitle: 'beds', media: 'gallery.0'},
      },
    }),
  ],
})

const floorField = defineField({
  name: 'floors',
  title: 'Floors / Units',
  type: 'array',
  description:
    'For a multi-unit building where each floor is a self-contained condo — e.g. Condo Galápagos: 5 independent apartments, one per floor, sharing the pool/jacuzzi/sauna/terrace described in the stay-level amenities above.',
  of: [
    defineArrayMember({
      type: 'object',
      name: 'floor',
      fields: [
        defineField({name: 'name', title: 'Name', type: 'string', description: 'e.g. Condo 1', validation: (rule) => rule.required()}),
        defineField({name: 'tagline', title: 'Tagline', type: 'string', description: 'Short highlight, e.g. "Bay view", "Guest favorite"'}),
        defineField({name: 'description', title: 'Description', type: 'text', rows: 4}),
        defineField({name: 'capacity', title: 'Guest capacity', type: 'number'}),
        defineField({name: 'bathrooms', title: 'Bathrooms', type: 'number'}),
        defineField({
          name: 'bedrooms',
          title: 'Bedrooms',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'bedroom',
              fields: [
                defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
                defineField({name: 'beds', title: 'Beds', type: 'string', description: 'e.g. 1 queen bed, 1 twin bed'}),
                defineField({
                  name: 'photo',
                  title: 'Photo',
                  type: 'image',
                  description: 'Shown as the "Room Photo" card for this bedroom in the Explore the Building section',
                  options: {hotspot: true},
                  fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
                }),
              ],
              preview: {select: {title: 'name', subtitle: 'beds', media: 'photo'}},
            }),
          ],
        }),
        {...amenitiesField, name: 'amenities', title: 'Unit amenities'},
        defineField({name: 'airbnbUrl', title: 'Airbnb listing URL', type: 'url', description: 'Link to this unit\'s live Airbnb listing — also used as the "Check Availability" button target'}),
        defineField({
          name: 'mainPhoto',
          title: 'Main photo',
          type: 'image',
          description: 'Large cover photo for this unit in the Explore the Building section (e.g. the living room or pool area)',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
        }),
        defineField({
          name: 'bathroomPhotos',
          title: 'Bathroom photos',
          type: 'array',
          description: 'Labeled bathroom photo cards for the Explore the Building section — independent of the "Bathrooms" count above',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'bathroomPhoto',
              fields: [
                defineField({name: 'label', title: 'Label', type: 'string', description: 'e.g. Private Bath, Modern Design', validation: (rule) => rule.required()}),
                defineField({name: 'image', title: 'Image', type: 'image', options: {hotspot: true}}),
              ],
              preview: {select: {title: 'label', media: 'image'}},
            }),
          ],
        }),
        defineField({
          name: 'otherRooms',
          title: 'Other rooms / spaces',
          type: 'array',
          description: 'Extra spaces some units have and others don\'t (e.g. a kitchenette, a terrace) — just a photo and a short description each',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'otherRoom',
              fields: [
                defineField({name: 'photo', title: 'Photo', type: 'image', options: {hotspot: true}}),
                defineField({name: 'description', title: 'Description', type: 'text', rows: 2}),
              ],
              preview: {select: {title: 'description', media: 'photo'}},
            }),
          ],
        }),
        defineField({
          name: 'gallery',
          title: 'Photos',
          type: 'array',
          description: 'Extra photos not shown in the Explore the Building grid above (reserved for a future full gallery)',
          of: [
            defineArrayMember({
              type: 'image',
              options: {hotspot: true},
              fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
            }),
          ],
        }),
      ],
      preview: {
        select: {title: 'name', subtitle: 'tagline', media: 'mainPhoto'},
      },
    }),
  ],
})

export const stay = defineType({
  name: 'stay',
  title: 'Stay',
  type: 'document',
  icon: HomeIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'rooms', title: 'Rooms'},
    {name: 'floors', title: 'Floors / Units'},
    {name: 'media', title: 'Media'},
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
    defineField({name: 'location', title: 'Location', type: 'string', group: 'content', description: 'e.g. Puerto Ayora, Santa Cruz'}),
    defineField({
      name: 'airbnbUrl',
      title: 'Airbnb listing URL',
      type: 'url',
      group: 'content',
      description: 'For a single-listing stay (uses "rooms", not "floors") — shows a "Check Availability on Airbnb" button on the stay page. Leave blank if this stay has no live Airbnb listing.',
    }),
    defineField({name: 'description', title: 'Description', type: 'text', group: 'content', rows: 5}),
    {...highlightsField, group: 'content'},
    {...amenitiesField, group: 'content'},
    {...faqField, group: 'content'},
    {...bannerField, group: 'media'},
    {...galleryGroupField, group: 'media'},
    {...roomField, group: 'rooms'},
    {...floorField, group: 'floors'},
  ],
  preview: {
    select: {title: 'name', subtitle: 'location', media: 'banner'},
  },
})
