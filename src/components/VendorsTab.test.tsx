/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { VendorsTab } from './VendorsTab.tsx';
import type { VendorRequirement, PaymentRecord } from '../types/plan.ts';

function VendorsTabTestHarness(props: {
  initialVendors?: VendorRequirement[];
  onLogPayment?: (payment: Omit<PaymentRecord, 'id'>) => void;
  onUpdateVendorsSpy?: (vendors: VendorRequirement[]) => void;
}) {
  const [vendors, setVendors] = useState<VendorRequirement[]>(
    props.initialVendors || [
      {
        type: 'Catering',
        est_low: 150000,
        est_high: 250000,
        questions: ['Can you provide live chaat counters?'],
        red_flags: ['No license'],
        outreach_message: 'Hi, inquiring about catering for our celebration in Delhi!',
        status: 'todo',
        quote: 180000,
      },
      {
        type: 'Photography',
        est_low: 60000,
        est_high: 100000,
        questions: ['Drone coverage included?'],
        red_flags: [],
        outreach_message: 'Hi, inquiring about wedding photography packages.',
        status: 'contacted',
      },
      {
        type: 'Decor',
        est_low: 120000,
        est_high: 200000,
        questions: [],
        red_flags: [],
        outreach_message: '',
        status: 'booked',
        quote: 150000,
      },
    ]
  );

  return (
    <VendorsTab
      vendors={vendors}
      city="Delhi"
      onUpdateVendors={(updated) => {
        setVendors(updated);
        props.onUpdateVendorsSpy?.(updated);
      }}
      onLogPayment={props.onLogPayment}
    />
  );
}

describe('VendorsTab Component', () => {
  it('renders status stepper with WAI-ARIA radiogroup and supports arrow-key navigation', () => {
    const updateSpy = vi.fn();
    render(<VendorsTabTestHarness onUpdateVendorsSpy={updateSpy} />);

    // Check radiogroups exist per vendor
    const radioGroups = screen.getAllByRole('radiogroup');
    expect(radioGroups.length).toBe(3);

    // Initial Catering status is "todo" ("To Do" radio is checked)
    const cateringRadioGroup = radioGroups[0];
    const todoRadio = cateringRadioGroup.querySelector('#radio-vendor-0-todo')!;
    expect(todoRadio).toHaveAttribute('aria-checked', 'true');

    // Focus and press ArrowRight to advance status to "contacted"
    fireEvent.keyDown(todoRadio, { key: 'ArrowRight' });

    expect(updateSpy).toHaveBeenCalled();
    const updatedVendors: VendorRequirement[] = updateSpy.mock.calls[0][0];
    expect(updatedVendors[0].status).toBe('contacted');
  });

  it('allows entering and updating quote in INR', () => {
    const updateSpy = vi.fn();
    render(<VendorsTabTestHarness onUpdateVendorsSpy={updateSpy} />);

    // Catering has existing quote of 180,000
    const quoteInputs = screen.getAllByRole('spinbutton', { name: /Quote amount in INR/i });
    expect(quoteInputs.length).toBe(3);

    const cateringQuoteInput = quoteInputs[0];
    expect(cateringQuoteInput).toHaveValue(180000);

    // Update quote to 195,000
    fireEvent.change(cateringQuoteInput, { target: { value: '195000' } });

    expect(updateSpy).toHaveBeenCalled();
    const updatedVendors: VendorRequirement[] = updateSpy.mock.calls[0][0];
    expect(updatedVendors[0].quote).toBe(195000);
  });

  it('offers to log the quote as a payment when vendor status becomes Booked', () => {
    const logPaymentSpy = vi.fn();
    render(<VendorsTabTestHarness onLogPayment={logPaymentSpy} />);

    // Advance Catering (has quote: 180000) from todo directly to booked
    const bookedRadios = screen.getAllByRole('radio', { name: /Booked/i });
    const cateringBookedRadio = bookedRadios[0];
    fireEvent.click(cateringBookedRadio);

    // Modal prompt appears offering to log the quote as a payment
    expect(screen.getByRole('heading', { name: /Log Booked Quote as Payment\?/i })).toBeInTheDocument();
    expect(screen.getByText(/₹1,80,000/i)).toBeInTheDocument();

    // Confirm "Log Payment"
    const confirmPaymentBtn = screen.getByRole('button', { name: 'Log Payment' });
    fireEvent.click(confirmPaymentBtn);

    expect(logPaymentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'Catering',
        amount: 180000,
        note: expect.stringContaining('Booked Catering'),
      })
    );

    // Modal closes
    expect(screen.queryByRole('heading', { name: /Log Booked Quote as Payment\?/i })).not.toBeInTheDocument();
  });

  it('filters vendors by status and shows status counts on filter pills', () => {
    render(<VendorsTabTestHarness />);

    // Filter pills display total and count per status
    // 3 total, 1 todo, 1 contacted, 0 shortlisted, 1 booked
    expect(screen.getByRole('button', { name: /All \(3\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /To Do \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Contacted \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shortlisted \(0\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Booked \(1\)/i })).toBeInTheDocument();

    // Filter by "Contacted"
    fireEvent.click(screen.getByRole('button', { name: /Contacted \(1\)/i }));

    // Only Photography should be visible
    expect(screen.getByText('Photography')).toBeInTheDocument();
    expect(screen.queryByText('Catering')).not.toBeInTheDocument();
    expect(screen.queryByText('Decor')).not.toBeInTheDocument();
  });

  it('renders Open WhatsApp wa.me link with encoded message and preserves copy button', () => {
    render(<VendorsTabTestHarness />);

    // Catering has outreach_message: "Hi, inquiring about catering for our celebration in Delhi!"
    const whatsAppLinks = screen.getAllByRole('link', { name: /Open WhatsApp/i });
    expect(whatsAppLinks.length).toBeGreaterThanOrEqual(1);

    const cateringWhatsApp = whatsAppLinks[0];
    expect(cateringWhatsApp).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/?text=')
    );
    expect(cateringWhatsApp.getAttribute('href')).toContain(
      encodeURIComponent('Hi, inquiring about catering for our celebration in Delhi!')
    );

    // Copy message button also exists
    const copyButtons = screen.getAllByRole('button', { name: /Copy outreach message/i });
    expect(copyButtons.length).toBeGreaterThanOrEqual(1);
  });
});
