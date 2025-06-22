// ======== schema.js ========
const Joi = require("joi");

const listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required().messages({
      "string.empty": "Title is required",
    }),
    description: Joi.string().allow("").optional(),
    image: Joi.string().uri().allow("").optional(),
    price: Joi.number().min(0).required().messages({
      "number.base": "Price must be a number",
      "number.min": "Price cannot be negative",
      "any.required": "Price is required",
    }),
    location: Joi.string().required().messages({
      "string.empty": "Location is required",
    }),
    country: Joi.string().required().messages({
      "string.empty": "Country is required",
    }),
  }).required(),
});

const reviewSchema = Joi.object({
  review: Joi.object({
    comment: Joi.string().required().messages({
      "string.empty": "Comment cannot be empty",
      "any.required": "Comment is required",
    }),
    rating: Joi.number().min(1).max(5).required().messages({
      "number.base": "Rating must be a number",
      "number.min": "Rating must be at least 1",
      "number.max": "Rating cannot be more than 5",
      "any.required": "Rating is required",
    }),
  }).required().messages({
    "any.required": `"review" is required`,
    "object.base": `"review" must be an object`,
  }),
});

// ✅ Correct export
module.exports = { listingSchema, reviewSchema };
