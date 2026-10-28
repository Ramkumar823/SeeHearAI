from backend.announcement_manager import AnnouncementManager

def test_duplicate_is_suppressed_until_cooldown():
    now = [100.0]
    manager = AnnouncementManager(cooldown=8, clock=lambda: now[0])
    assert manager.get_new_objects(["chair", "chair"]) == ["chair"]
    assert manager.get_new_objects(["chair"]) == []
    now[0] += 9
    assert manager.get_new_objects(["chair"]) == ["chair"]

def test_new_labels_are_returned_once():
    manager = AnnouncementManager(cooldown=8, clock=lambda: 100.0)
    assert manager.get_new_objects(["chair", "person", "chair"]) == ["chair", "person"]

def test_clear_resets_history():
    manager = AnnouncementManager(cooldown=8, clock=lambda: 100.0)
    manager.get_new_objects(["chair"])
    manager.clear()
    assert manager.get_new_objects(["chair"]) == ["chair"]
