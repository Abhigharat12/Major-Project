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

module.exports = { listingSchema };
