#!/usr/bin/env perl

use strict;
use warnings;

# Extracting changes for version, e.g., for v1.0.0 the arg should be without the 'v' prefix

my $VERSION_IN_TAG = 'v' . $ARGV[0];

# Open the CHANGELOG.md file
open my $fh, '<', 'CHANGELOG.md' or die "Could not open 'CHANGELOG.md': $!";

# Read the file content
my $content = do { local $/; <$fh> };

# Close the file handle
close $fh;

# Extract the version section
my ($version_section) = $content =~ /## \[\Q$VERSION_IN_TAG\E\](.*?)(?=^## |\z)/ms;

if (!defined $version_section) {
    exit;
}

# Remove leading and trailing empty lines
$version_section =~ s/^\s*\n//;
$version_section =~ s/\n\s*$//;

$version_section .= "\n";

# Print the extracted section
print $version_section;
