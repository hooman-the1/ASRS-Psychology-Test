import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'latinToPersianNumbers',
  standalone: true,
})
export class LatinToPersianNumbersPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }

    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    return value.toString().replace(/[0-9]/g, digit => persianDigits[Number(digit)]);
  }
}
