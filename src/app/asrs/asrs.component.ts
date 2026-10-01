import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';

import {
  getSeverityCategory,
  getSeverityText,
  getRecommendationText,
  getGaugeColor,
  getEmojiIcon,
  getGaugeMarkers
} from './asrs.helpers';

import { SeverityCategory, questions } from './asrs.constants';

@Component({
  selector: 'app-asrs',
  templateUrl: './asrs.component.html',
  styleUrls: ['./asrs.component.scss']
})
export class AsrsComponent implements OnInit {
  showResult = false;
  asrsForm!: FormGroup;
  gaugeValue = 0;
  totalScore = 0;
  currentStep = 0;
  questions = questions;

  severityText = '';
  recommendationText = '';
  gaugeColorCode = '';
  severityEmojiIcon = '';
  severityColor = '';
  gaugeLabel = 'Score';

  gaugeMarkers: any = {};

  constructor(
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.asrsForm = this.fb.group({
      answers: this.fb.array(this.questions.map(() => this.fb.control(null, Validators.required)))
    });
  }

  get answers(): FormArray {
    return this.asrsForm.get('answers') as FormArray;
  }

  getCurrentControl(): FormControl {
    return this.answers.at(this.currentStep) as FormControl;
  }

  next(): void {
    if (this.getCurrentControl().invalid) return;
    this.currentStep++;
  }

  prev(): void {
    this.currentStep--;
  }

  calculateScore(): void {
    this.totalScore = this.answers.value.reduce((acc: number, val: number) => acc + +val, 0);
    this.gaugeValue = this.totalScore;
  }

  setSeverityDetails(category: SeverityCategory): void {
    this.severityText = getSeverityText(category);
    this.recommendationText = getRecommendationText(category);
    this.gaugeColorCode = getGaugeColor(category);
    this.severityEmojiIcon = getEmojiIcon(category);
    this.severityColor = this.gaugeColorCode;
  }

  finalizeResults(): void {
    this.showResult = true;
    this.asrsForm.reset();
    this.currentStep = 0;
    this.gaugeMarkers = getGaugeMarkers(this.gaugeValue, this.gaugeColorCode);
  }

  submit(): void {
    if (this.asrsForm.invalid) return;

    this.calculateScore();
    const category = getSeverityCategory(this.totalScore);
    this.setSeverityDetails(category);
    this.finalizeResults();
  }

  private handlePropertiesInReset(): void {
    this.asrsForm.reset();
    this.currentStep = 0;
    this.totalScore = 0;
    this.showResult = false;
  }

  restart(): void {
    this.handlePropertiesInReset();
  }
}
