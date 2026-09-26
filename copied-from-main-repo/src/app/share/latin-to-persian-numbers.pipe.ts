import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'latinToPersianNumbers'
})
export class LatinToPersianNumbersPipe implements PipeTransform {

  transform(value: string | number | null | undefined, ...args: unknown[]): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const latinDigits = '0123456789';

    const convertedValue = value.toString().split('').map(char => {
      const index = latinDigits.indexOf(char);
      return index !== -1 ? persianDigits[index] : char;
    }).join('');

    return convertedValue;
  }

}
