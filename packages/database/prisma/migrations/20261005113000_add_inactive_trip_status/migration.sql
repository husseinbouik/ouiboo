-- AlterEnum: add INACTIVE to TripStatus (additive, backward-compatible)
ALTER TYPE "TripStatus" ADD VALUE 'INACTIVE';
