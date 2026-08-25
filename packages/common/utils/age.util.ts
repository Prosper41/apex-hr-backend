import { BadRequestException } from '@nestjs/common';

export function assertMinimumAge(dateOfBirth: string, minAge = 18): void {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (age < minAge) {
    throw new BadRequestException(`User must be at least ${minAge} years old`);
  }
}
