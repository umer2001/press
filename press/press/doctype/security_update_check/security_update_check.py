# Copyright (c) 2022, Frappe and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from press.telegram_utils import Telegram
from press.runner import Ansible
from press.utils import log_error


class SecurityUpdateCheck(Document):

	@frappe.whitelist()
	def start(self):
		frappe.enqueue_doc(self.doctype, self.name, "_start", queue="long", timeout=2500)

	def _start(self):
		try:
			ansible = Ansible(
				user="root",
				playbook="security_update_check.yml",
				server=frappe.get_doc(self.server_type, self.server),
			)
			self.reload()
			self.play = ansible.play
			self.status = "Running"
			self.save()
			frappe.db.commit()
			play = ansible.run()
			if play.status == "Success":
				self.check_output_and_open()
			else:
				self.fail()
		except Exception:
			log_error("Security Update Check Exception", check=self.as_dict())
			self.fail()
		self.save()

	def check_output_and_open(self):
		# TODO: check if output has  #
		self.status = "Open"
		play = frappe.get_doc("Ansible Play", self.play)
		domain = frappe.get_value("Press Settings", "Press Settings", "domain")
		message = f"""
Security updates available for some packages on *{self.server}*.
Might wanna check.

[Ansible Play]({domain}{play.get_url()})
[Update Check]({domain}{self.get_url()})
"""
		chat_id = frappe.db.get_value(
			"Press Settings", "Press Settings", "telegram_alert_chat_id"
		)
		telegram = Telegram(chat_id)
		telegram.send(message)

