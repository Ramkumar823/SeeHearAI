"""Simple duplicate-suppression logic, independent of the browser speech engine."""
import time
from config import ANNOUNCEMENT_COOLDOWN_SECONDS

class AnnouncementManager:
    def __init__(self, cooldown=ANNOUNCEMENT_COOLDOWN_SECONDS, clock=None):
        self.cooldown = cooldown
        self.clock = clock or time.monotonic
        self.last_announced = {}

    def get_new_objects(self, labels):
        now = self.clock()
        unique = list(dict.fromkeys(labels))
        fresh = []
        for label in unique:
            previous = self.last_announced.get(label)
            if previous is None or now - previous >= self.cooldown:
                fresh.append(label)
                self.last_announced[label] = now
        # Expire labels no longer relevant after a longer interval.
        for label, timestamp in list(self.last_announced.items()):
            if now - timestamp > max(self.cooldown * 4, 60):
                del self.last_announced[label]
        return fresh

    def clear(self):
        self.last_announced.clear()
