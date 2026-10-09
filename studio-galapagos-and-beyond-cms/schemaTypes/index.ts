import {destination} from './destination'
import {island} from './island'
import {activityTag} from './activityTag'
import {cruiseClass} from './cruiseClass'
import {tourCategory} from './tourCategory'
import {ship} from './ship'
import {stay} from './stay'
import {trip} from './trip'
import {review} from './review'
import {socialLinks} from './socialLinks'
import {legalPage} from './legalPage'
import {itineraryDay} from './shared/itineraryDay'

export const schemaTypes = [
  // Taxonomy / reusable references
  destination,
  island,
  activityTag,
  cruiseClass,
  tourCategory,

  // Core content
  ship,
  stay,
  trip,
  review,

  // Singletons
  socialLinks,

  // One document per page
  legalPage,

  // Embedded object types
  itineraryDay,
]
