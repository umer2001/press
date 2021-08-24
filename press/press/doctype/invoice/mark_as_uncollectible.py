# Copyright (c) 2021, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe


# this should probably be run via server scripts
def execute():
	"""Mark invoices that are unpaid for more than 6 months as Uncollectible"""
	six_months_ago = frappe.utils.add_to_date(None, months=-6)
	invoices = frappe.db.get_all(
		"Invoice",
		filters={"due_date": ("<", six_months_ago), "status": "Unpaid", "docstatus": 0},
	)

	for inv in invoices:
		invoice = frappe.get_doc("Invoice", inv)
		invoice.status = "Uncollectible"
		invoice.save()