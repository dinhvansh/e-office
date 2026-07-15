# Database backup artifacts

Database backups and serialized seed snapshots are not distributed with the
public source package. They can contain tenant records, internal hostnames,
and credentials that are appropriate only for an isolated local test database.

Use the documented migration and seed commands in the root README to create a
fresh local environment. Store real backups in the deployment operator's
private backup location, never in Git. The JSON ignore rule in the repository
prevents newly generated snapshots in this directory from being committed.
