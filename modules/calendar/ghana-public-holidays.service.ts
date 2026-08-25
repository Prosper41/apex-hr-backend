import { Injectable } from '@nestjs/common';

export interface PublicHoliday {
  name: string;
  date: string; // YYYY-MM-DD
  description?: string;
}

@Injectable()
export class GhanaPublicHolidaysService {
  private getHolidaysForYear(year: number): PublicHoliday[] {
    return [
      { name: "New Year's Day", date: `${year}-01-01` },
      { name: 'Constitution Day', date: `${year}-01-07` },
      { name: 'Independence Day', date: `${year}-03-06` },
      { name: 'Good Friday', date: this.getGoodFriday(year) },
      { name: 'Holy Saturday', date: this.getHolySaturday(year) },
      { name: 'Easter Monday', date: this.getEasterMonday(year) },
      { name: 'May Day (Workers Day)', date: `${year}-05-01` },
      { name: 'Africa Union Day', date: `${year}-05-25` },
      { name: 'Republic Day', date: `${year}-07-01` },
      { name: 'Founders Day', date: `${year}-08-04` },
      { name: 'Kwame Nkrumah Memorial Day', date: `${year}-09-21` },
      { name: 'Farmers Day', date: this.getFarmersDay(year) },
      { name: 'Christmas Day', date: `${year}-12-25` },
      { name: 'Boxing Day', date: `${year}-12-26` },
    ];
  }

  // Easter calculation using Anonymous Gregorian algorithm
  private getEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  private getGoodFriday(year: number): string {
    const easter = this.getEaster(year);
    easter.setDate(easter.getDate() - 2);
    return easter.toISOString().slice(0, 10);
  }

  private getHolySaturday(year: number): string {
    const easter = this.getEaster(year);
    easter.setDate(easter.getDate() - 1);
    return easter.toISOString().slice(0, 10);
  }

  private getEasterMonday(year: number): string {
    const easter = this.getEaster(year);
    easter.setDate(easter.getDate() + 1);
    return easter.toISOString().slice(0, 10);
  }

  // Farmers Day — first Friday of December
  private getFarmersDay(year: number): string {
    const date = new Date(year, 11, 1);
    while (date.getDay() !== 5) {
      date.setDate(date.getDate() + 1);
    }
    return date.toISOString().slice(0, 10);
  }

  getForMonth(month: number, year: number): PublicHoliday[] {
    return this.getHolidaysForYear(year).filter((h) => {
      const holidayMonth = parseInt(h.date.split('-')[1], 10);
      return holidayMonth === month;
    });
  }
}
