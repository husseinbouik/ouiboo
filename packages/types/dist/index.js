"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutStatus = exports.BookingStatus = exports.TripCategory = exports.TripStatus = exports.VerificationStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["Agency"] = "AGENCY";
    UserRole["Traveler"] = "TRAVELER";
    UserRole["Admin"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["Pending"] = "PENDING";
    VerificationStatus["Verified"] = "VERIFIED";
    VerificationStatus["Rejected"] = "REJECTED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var TripStatus;
(function (TripStatus) {
    TripStatus["Active"] = "ACTIVE";
    TripStatus["Draft"] = "DRAFT";
    TripStatus["Archived"] = "ARCHIVED";
})(TripStatus || (exports.TripStatus = TripStatus = {}));
var TripCategory;
(function (TripCategory) {
    TripCategory["Adventure"] = "ADVENTURE";
    TripCategory["Cultural"] = "CULTURAL";
    TripCategory["Luxury"] = "LUXURY";
    TripCategory["Budget"] = "BUDGET";
})(TripCategory || (exports.TripCategory = TripCategory = {}));
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["Pending"] = "PENDING";
    BookingStatus["Confirmed"] = "CONFIRMED";
    BookingStatus["Cancelled"] = "CANCELLED";
    BookingStatus["Completed"] = "COMPLETED";
    BookingStatus["PendingPayment"] = "PENDING_PAYMENT";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var PayoutStatus;
(function (PayoutStatus) {
    PayoutStatus["Pending"] = "PENDING";
    PayoutStatus["Approved"] = "APPROVED";
    PayoutStatus["Rejected"] = "REJECTED";
    PayoutStatus["Paid"] = "PAID";
})(PayoutStatus || (exports.PayoutStatus = PayoutStatus = {}));
