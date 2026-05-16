const DEFAULT_AMENITIES = ["Wifi", "Kitchen", "Air conditioning", "Workspace"];
const DEFAULT_RULES = ["No smoking", "No parties", "Respect quiet hours"];

const splitLines = (value, fallback = []) => {
  const items = String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? [...new Set(items)] : fallback;
};

const parseDateList = (value) => {
  return [
    ...new Set(
      String(value || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)),
    ),
  ];
};

const toNumber = (value) => Number.parseFloat(value);
const toInteger = (value) => Number.parseInt(value, 10);

const getUploadPaths = (req) => {
  const files = [
    ...(req.files?.photos || []),
    ...(req.files?.photo || []),
    ...(Array.isArray(req.files) ? req.files : []),
  ];
  return files.map((file) => `/uploads/${file.filename}`);
};

const buildListingPayload = (body, existingImages = [], uploadedImages = []) => {
  const images = uploadedImages.length > 0 ? uploadedImages : existingImages;
  return {
    houseName: String(body.houseName || "").trim(),
    price: toNumber(body.price),
    location: String(body.location || "").trim(),
    rating: Number.isFinite(toNumber(body.rating)) ? toNumber(body.rating) : 4.8,
    description: String(body.description || "").trim(),
    maxGuests: toInteger(body.maxGuests),
    bedrooms: toInteger(body.bedrooms),
    bathrooms: toInteger(body.bathrooms),
    amenities: splitLines(body.amenities, DEFAULT_AMENITIES),
    houseRules: splitLines(body.houseRules, DEFAULT_RULES),
    blockedDates: parseDateList(body.blockedDates),
    status: body.status === "draft" ? "draft" : "active",
    images,
    photo: images[0] || "",
  };
};

const validateListing = (payload, requireImage = false) => {
  const errors = [];
  if (payload.houseName.length < 3) errors.push("Listing name must be at least 3 characters.");
  if (!Number.isFinite(payload.price) || payload.price <= 0) errors.push("Nightly price must be greater than 0.");
  if (payload.location.length < 2) errors.push("Location is required.");
  if (!Number.isFinite(payload.rating) || payload.rating < 1 || payload.rating > 5) errors.push("Rating must be between 1 and 5.");
  if (payload.description.length < 30) errors.push("Description must be at least 30 characters.");
  if (!Number.isFinite(payload.maxGuests) || payload.maxGuests < 1) errors.push("Max guests must be at least 1.");
  if (!Number.isFinite(payload.bedrooms) || payload.bedrooms < 0) errors.push("Bedrooms must be 0 or more.");
  if (!Number.isFinite(payload.bathrooms) || payload.bathrooms < 0) errors.push("Bathrooms must be 0 or more.");
  if (requireImage && payload.images.length === 0) errors.push("Upload at least one clear listing photo.");
  return errors;
};

module.exports = {
  buildListingPayload,
  getUploadPaths,
  parseDateList,
  splitLines,
  validateListing,
};
