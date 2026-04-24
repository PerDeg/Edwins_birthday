'use strict';

const EGRID     = 32;
const ECANVAS_W = 960;
const ECANVAS_H = 540;
const EGROUND_Y = 490;
const EPLAT_H   = 14;

// ── Tool palette ──────────────────────────────────────────────────────────────
// To add a new placeable item: add an entry here. No other file needs changing.
const E_TOOLS = [
  { group: 'Välj', items: [
    { id: 'select',  label: 'Markera',    hint: 'Klicka = välj. Drag = flytta. Del = radera.' },
    { id: 'eraser',  label: 'Radera',     hint: 'Klicka på ett objekt för att ta bort det.' },
  ]},
  { group: 'Terräng', items: [
    { id: 'platform', label: 'Plattform', hint: 'Klicka och dra åt höger för att rita.' },
  ]},
  { group: 'Fiender', items: [
    { id: 'grunt',  label: 'Grunt',     hint: 'På plattform = patrullerar. På marken = markfiende.' },
    { id: 'archer', label: 'Bågskyt',  hint: 'Kräver en plattform under sig.' },
    { id: 'boss',   label: 'BOSS',     hint: 'En per level. Placera vid slutet.' },
  ]},
  { group: 'Gömställen', items: [
    { id: 'hiding-barrel', label: 'Tunna',  hint: 'Klicka för att placera en tunna att gömma sig i.' },
    { id: 'hiding-box',    label: 'Låda',   hint: 'Klicka för att placera en trälåda att gömma sig bakom.' },
    { id: 'hiding-shadow', label: 'Skugga', hint: 'Klicka för att placera en skuggpool på marken.' },
  ]},
  { group: 'Hinder', items: [
    { id: 'ladder', label: 'Stege',  hint: 'Klicka för att placera en klätterbar stege.' },
    { id: 'spike',  label: 'Spikar', hint: 'Klicka för att placera spikar (rotation 180° = spetsar upp).' },
  ]},
  { group: 'Föremål', items: [
    { id: 'pickup-heart',    label: 'Hjärta',     hint: 'Återställer liv eller ger gem-kraft.' },
    { id: 'pickup-shuriken', label: 'Shuriken',   hint: 'Ger spelaren kaststjärna.' },
    { id: 'pickup-triple',   label: '3× Stjärna', hint: 'Ger trippel-shuriken.' },
    { id: 'pickup-knife',    label: 'Kniv',       hint: 'Ger genomträngande kniv.' },
  ]},
];

// ── Rendering colours ─────────────────────────────────────────────────────────
const E_COLORS = {
  platform:           { top: '#6daa30', body: '#3a5a1a', border: '#8aba3a' },
  grunt:              '#c03030',
  archer:             '#2050c8',
  boss:               '#9900cc',
  'hiding-barrel':    '#7a4020',
  'hiding-box':       '#8b5e2b',
  'hiding-shadow':    '#180028',
  'ladder':           '#c8a83c',
  'spike':            '#b0b0b0',
  'pickup-heart':     '#e63946',
  'pickup-shuriken':  '#b0b0cc',
  'pickup-triple':    '#ff6b35',
  'pickup-knife':     '#4fc3f7',
};

// ── Sky gradients per bgTheme (0/1/2) ─────────────────────────────────────────
const E_SKY = [
  ['#05051a', '#0d0d28', '#0a1020'],
  ['#0a0a1e', '#1a1a3a', '#2a1a1a'],
  ['#1a0505', '#3a0a0a', '#1a0808'],
];
